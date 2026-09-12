import { googleClientId } from "@/core/env";
import { Logger } from "@/core/logging/logger";
import { ErrorClassifier } from "@/domain/errors/ErrorClassifier";

/** Routes known-noisy GSI console output to Logger instead of the browser console. Idempotent. */
let consolePatched = false;
function interceptGsiNoise() {
  if (consolePatched) {
    return;
  }
  consolePatched = true;

  const origWarn = console.warn;
  const origError = console.error;

  console.warn = (...args: unknown[]) => {
    const msg = typeof args[0] === "string" ? String(args[0]) : "";
    if (msg.includes("[GSI_LOGGER]") || msg.includes("prompt UI status methods")) {
      Logger.auth.debug("GSI Warning (Intercepted)", ...args);
      return;
    }
    origWarn.apply(console, args as any);
  };

  console.error = (...args: unknown[]) => {
    const msg = typeof args[0] === "string" ? String(args[0]) : "";
    if (
      msg.includes("[GSI_LOGGER]") ||
      msg.includes("FedCM") ||
      msg.includes("NotSupportedError")
    ) {
      Logger.auth.debug("GSI Error (Intercepted)", ...args);
      return;
    }
    origError.apply(console, args as any);
  };
}
interceptGsiNoise();

/** OAuth scope required to read/write files the app creates in Drive. */
export const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const UNCONFIGURED_MESSAGE =
  "Google sign-in is not configured. Add VITE_GOOGLE_CLIENT_ID to .env.local and restart the dev server.";

/** `google.accounts.oauth2.initCodeClient` **return** value. */
interface GsiClient {
  requestCode(): void;
}

/** `google.accounts.oauth2.initCodeClient` **input** configuration.
 *
 * Used to open a popup to request an OAuth code from Google. The config tells GSI what client ID, scopes, and UX mode to use, and provides a callback to handle the response (code or error).
 */
interface GsiConfig {
  client_id: string;
  scope: string;
  /** If true, the already-granted scopes will also be included in the request. */
  include_granted_scopes?: boolean;
  ux_mode: "popup" | "redirect";
  redirect_uri?: string;
  /** If `offline`, the app receives a refresh token in addition to the access token. */
  access_type: "offline" | "online";
  /** A space-delimited list of prompts to display.
   *
   * Supported values:
   * - `consent`: Prompts the user for consent before returning an authorization code. This is required to receive a refresh token.
   * - `select_account`: Prompts the user to select an account. This is useful when the user has multiple accounts and you want to ensure they choose the correct one.
   * - `none`: No prompt is displayed. If the user is not already authenticated, an error is returned.
   */
  prompt?: string;
  /** If provided, pre-fills the account chooser with the given email address or sub identifier. */
  login_hint?: string;
  callback: (response: { code?: string; error?: string; error_description?: string }) => void;
}

/**
 * Config accepted by `google.accounts.id.initialize`
 *
 * Used to initialize the Google Identity Services (GSI) One Tap and Sign-in button flows. The config tells GSI what client ID to use, how to handle credential responses, and some optional behavior flags.
 */
export interface GsiIdConfiguration {
  client_id: string;
  /** If true, the One Tap prompt will be canceled if the user clicks outside the prompt. */
  cancel_on_tap_outside?: boolean;
  /** If true, account selection will be rendered in a browser-native dialog. Provided FedCM (Federated Credential Management) is available. */
  use_fedcm_for_button?: boolean;
  /** If true, browsers with Intelligent Tracking Prevention (ITP) will be supported via legacy UX. */
  itp_support?: boolean;
  callback: (response: {
    status?: string;
    credential?: string;
    error?: string;
    error_description?: string;
  }) => void;
}

/** Configuration for the GSI Sign-in Button UX. */
interface GsiButtonConfig {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  logo_alignment?: "left" | "center";
  /** The width of the button in pixels. */
  width?: number;
  locale?: string;
}

/** Shape of `window.google` before it's known to be fully loaded. Intentionally loose. */
interface GsiShell {
  accounts?: {
    oauth2?: unknown;
    id?: unknown;
  };
}

/** Typed representation of `GsiShell` once it's fully loaded. */
interface Gsi {
  /** The documented GSI OAuth code-flow API. */
  oauth2: { initCodeClient(config: GsiConfig): GsiClient };
  /** The documented GSI OICD (OpenID Connect) One Tap + Sign-in button API. */
  accounts?: {
    id?: {
      initialize(config: GsiIdConfiguration): void;
      prompt?(callback?: (notification?: unknown) => void): void;
      renderButton?(container: HTMLElement, options?: GsiButtonConfig): void;
      cancel?(): void;
      disableAutoSelect?(): void;
    };
  };
}

/** Intentionally thinner version of `Gsi.accounts.id`. Just enough to be useful. */
export interface GsiAccountsIdLike {
  initialize(config: GsiIdConfiguration): void;
  prompt?(callback?: (notification?: unknown) => void): void;
  renderButton?(container: HTMLElement, options?: GsiButtonConfig): void;
}

/** Public contract for the GSI identity-flow. */
export interface IdentityFlowHandle {
  renderButton(container: HTMLElement): void;
  promptOneTap(): void;
  onCredential(handler: (credential: string) => void): void;
  onFlowError(handler: (reason: string, description?: string) => void): void;
}

/** The origin of the currently-loaded page, or `<unknown>` when unavailable. */
export function currentOrigin(): string {
  try {
    return window.location.origin;
  } catch {
    return "<unknown>";
  }
}

/** Warms the GSI script + oauth2 client ahead of any user click. */
export function preloadGsi(): void {
  if (!CLIENT_ID) {
    Logger.auth.warn(
      "preloadGsi: Google sign-in is not configured. Skipping preload. " + UNCONFIGURED_MESSAGE,
    );
    return;
  }
  loadGsi().catch(() => {
    // Intentionally ignored: requestDriveCode() will surface the real error against the user's actual click.
  });
}

let identityFlowPromise: Promise<IdentityFlowHandle> | null = null;
/** Initializes the Google Identity Services (GSI) identity(OIDC) flow. */
export function initIdentityFlow(): Promise<IdentityFlowHandle> {
  if (identityFlowPromise) {
    return identityFlowPromise;
  }

  identityFlowPromise = loadGsi().then(async (gsi) => {
    const accountsId = gsi.accounts?.id;
    if (!accountsId) {
      throw new Error(
        "Google identity service is unavailable. " +
          `Current origin \`${currentOrigin()}\`. ` +
          "Confirm this origin is an Authorized JavaScript origin.",
      );
    }

    const isFedCmSupported = await supportsActualFedCm();
    return buildIdentityFlowHandle(accountsId, CLIENT_ID ?? "", isFedCmSupported);
  });

  identityFlowPromise.catch(() => {
    identityFlowPromise = null;
  });
  return identityFlowPromise;
}

/** Builds a public handle for the identity flow. */
export function buildIdentityFlowHandle(
  accountsId: GsiAccountsIdLike,
  clientId: string,
  isFedCmSupported: boolean = false,
): IdentityFlowHandle {
  let credentialHandler: ((credential: string) => void) | null = null;
  let flowErrorHandler: ((reason: string, description?: string) => void) | null = null;

  let oneTapPrompted = false;

  let buttonContainer: HTMLElement | null = null;
  let themeObserver: MutationObserver | null = null;

  accountsId.initialize({
    client_id: clientId,
    cancel_on_tap_outside: false,
    use_fedcm_for_button: isFedCmSupported,
    itp_support: true,
    callback: (response) => {
      if (response.credential) {
        credentialHandler?.(response.credential);
      } else if (response.error) {
        Logger.auth.warn("identity flow error response", {
          reason: response.error,
          description: response.error_description,
        });
        flowErrorHandler?.(response.error, response.error_description);
      }
    },
  });

  function paintButton(container: HTMLElement): void {
    if (!accountsId.renderButton) {
      return;
    }
    container.replaceChildren();
    accountsId.renderButton(container, {
      type: "standard",
      theme: currentTheme() === "light" ? "filled_black" : "outline",
      size: "large",
      text: isFedCmSupported ? "continue_with" : "signin_with",
      shape: "pill",
    });
  }

  return {
    renderButton(container: HTMLElement): void {
      buttonContainer = container;
      paintButton(container);

      if (!themeObserver && typeof MutationObserver !== "undefined") {
        themeObserver = new MutationObserver(() => {
          if (buttonContainer) {
            paintButton(buttonContainer);
          }
        });
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["data-theme"],
        });
      }
    },

    promptOneTap(): void {
      if (oneTapPrompted) {
        return;
      }
      oneTapPrompted = true;
      accountsId.prompt?.();
    },

    onCredential(handler: (credential: string) => void): void {
      credentialHandler = handler;
    },

    onFlowError(handler: (reason: string, description?: string) => void): void {
      flowErrorHandler = handler;
    },
  };
}

/** Requests a Google Drive authorization code. */
export async function requestDriveCode(opts: {
  scope: string;
  offline: boolean;
  loginHint?: string;
  prompt?: string;
}): Promise<{ code: string }> {
  if (!CLIENT_ID) {
    throw new Error(UNCONFIGURED_MESSAGE);
  }

  const wasPreloaded = Boolean(readyGsiShell());
  if (!wasPreloaded) {
    Logger.auth.debug(
      "requestDriveCode: GSI was not preloaded — the sign-in popup may be " +
        "silently blocked on Safari/iOS if the click-to-popup gap exceeds " +
        "the browser's transient user-activation window. Call preloadGsi() " +
        "earlier (e.g. on mount) to close this gap.",
    );
  }

  const gsi = await loadGsi();
  return new Promise<{ code: string }>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      finish(() =>
        reject(
          ErrorClassifier.authDenied(buildCodeFlowTimeoutMessage(currentOrigin()), {
            surface: { surface: "toast" },
          }),
        ),
      );
    }, 45_000);

    const client = gsi.oauth2.initCodeClient({
      client_id: CLIENT_ID!,
      scope: opts.scope,
      ux_mode: "popup",
      access_type: opts.offline ? "offline" : "online",
      ...(opts.prompt ? { prompt: opts.prompt } : {}),
      ...(opts.loginHint ? { login_hint: opts.loginHint } : {}),
      callback: (response) => {
        if (response.code) {
          finish(() => resolve({ code: response.code as string }));
        } else {
          const detail =
            response.error_description ?? response.error ?? "Google sign-in was cancelled.";
          const message =
            response.error === "popup_closed_by_user" || response.error === "access_denied"
              ? "Google sign-in was cancelled before access was granted."
              : detail;

          finish(() => reject(new Error(message)));
        }
      },
    });

    client.requestCode();
  });
}

/** User-facing copy for a timed-out Drive code flow, carrying the failing origin for diagnosis. */
export function buildCodeFlowTimeoutMessage(origin: string): string {
  return (
    "Google sign-in timed out. Please try again — if Google showed an error page, " +
    `this address (${origin}) may not be registered for Rival.`
  );
}

/** Maps a GSI identity-flow error to user-facing copy. */
export function identityFlowErrorToMessage(reason: string, description?: string): string {
  if (reason === "popup_closed_by_user" || reason === "access_denied") {
    return "Sign-in was cancelled.";
  }
  if (reason === "origin_mismatch") {
    return "Google blocked sign-in because this address is not registered for Rival. Open the app from an approved address.";
  }
  return description ?? reason ?? "Google sign-in didn't complete.";
}

/** Checks FedCM support by attempting to use the IdentityCredential API via a fake test call. */
async function supportsActualFedCm(): Promise<boolean> {
  if (typeof window === "undefined" || !("IdentityCredential" in window)) {
    return false;
  }

  try {
    await navigator.credentials.get({
      identity: {
        providers: [{ clientId: "test", configURL: "invalid-url" }],
      },
    } as any);
    return true;
  } catch (e: any) {
    return e.name !== "NotSupportedError";
  }
}

let gsiLoadPromise: Promise<Gsi> | null = null;
/**
 * Loads the Google Identity Services library.
 * Polls every 150ms for up to 10s to check if the library is ready. If it fails to load, rejects with an error.
 */
function loadGsi(): Promise<Gsi> {
  if (gsiLoadPromise) {
    return gsiLoadPromise;
  }

  gsiLoadPromise = new Promise<Gsi>((resolve, reject) => {
    const google = readyGsiShell();
    if (google) {
      resolve(toGsi(google));
      return;
    }

    const script = window.document.createElement("script");
    script.id = "google-gsi";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    const MAX_WAIT_MS = 10_000;
    const POLL_MS = 150;
    const startedAt = Date.now();
    let settled = false;

    const poll = () => {
      if (settled) {
        return;
      }

      const google = readyGsiShell();
      if (google) {
        settled = true;
        resolve(toGsi(google));
        return;
      }

      if (Date.now() - startedAt > MAX_WAIT_MS) {
        settled = true;
        const hasShell = Boolean(windowGoogle());
        const hint = hasShell
          ? "Google Identity Services loaded but the OAuth code-flow API is unavailable. " +
            `Current origin \`${currentOrigin()}\`. ` +
            "Confirm this origin is in the client's Authorized JavaScript origins."
          : "Google Identity Services failed to load (script blocked or network error).";
        reject(new Error(hint));
        return;
      }

      setTimeout(poll, POLL_MS);
    };

    script.onload = () => poll();
    script.onerror = () => {
      if (settled) {
        return;
      }
      settled = true;
      reject(new Error("Failed to load Google Identity Services."));
    };

    window.document.head.appendChild(script);
    poll();
  });

  return gsiLoadPromise;
}

function readyGsiShell(): GsiShell | undefined {
  const google = windowGoogle();
  return google && gsiOauth2Ready(google) ? google : undefined;
}

function gsiOauth2Ready(google: unknown): boolean {
  return gsiOauth2(google as GsiShell) !== null;
}

function gsiOauth2(google: GsiShell): { initCodeClient: (config: GsiConfig) => GsiClient } | null {
  const oauth2 = google.accounts?.oauth2;
  if (
    oauth2 &&
    typeof oauth2 === "object" &&
    typeof (oauth2 as { initCodeClient?: unknown }).initCodeClient === "function"
  ) {
    return oauth2 as { initCodeClient: (config: GsiConfig) => GsiClient };
  }
  return null;
}

function toGsi(google: GsiShell): Gsi {
  const oauth2 = gsiOauth2(google);
  if (!oauth2) {
    throw new Error(
      "Google Identity Services oauth2 API is unavailable. " +
        `Current origin \`${currentOrigin()}\`. ` +
        "Confirm this origin is in the client's Authorized JavaScript origins.",
    );
  }
  return {
    oauth2,
    accounts: google.accounts as Gsi["accounts"],
  };
}

function windowGoogle(): GsiShell | undefined {
  return (window as unknown as { google?: GsiShell }).google;
}

function currentTheme(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

let CLIENT_ID: string | null = googleClientId();
