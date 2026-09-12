import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import {
  buildIdentityFlowHandle,
  buildCodeFlowTimeoutMessage,
  identityFlowErrorToMessage,
  type GsiAccountsIdLike,
  type IdentityFlowHandle,
} from "./gsiClient";

/**
 * Builds a fake `accounts.id` that records every call. This lets us assert the
 * *driving* code's contract — One Tap is shown exactly once, the notification
 * callback is wired, initialize carries the right config — without a real GSI
 * script (Google's suppression/FedCM/cooldown behavior can't be simulated, so
 * we pin what we control: that we ASK to show One Tap, once, opportunistically).
 */
function makeFakeAccountsId() {
  const prompt = vi.fn<NonNullable<GsiAccountsIdLike["prompt"]>>((cb) => {
    // Simulate Google suppressing One Tap (no notification shown).
    cb?.({} as never);
  });
  const initialize = vi.fn();
  const renderButton = vi.fn();
  const accountsId: GsiAccountsIdLike = {
    initialize: initialize as unknown as GsiAccountsIdLike["initialize"],
    prompt,
    renderButton: renderButton as unknown as GsiAccountsIdLike["renderButton"],
  };
  return { accountsId, initialize, prompt, renderButton };
}

/** Minimal container the handle renders the button into. */
function fakeContainer(): HTMLElement {
  return { replaceChildren: vi.fn() } as unknown as HTMLElement;
}

beforeEach(() => {
  // `currentDataTheme` reads the document's light/dark attribute; node has
  // neither document nor a data-theme default, so pin it to light.
  vi.stubGlobal("document", { documentElement: { getAttribute: () => "light" } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildIdentityFlowHandle — One Tap / identity handle", () => {
  test("initialize sets client_id and disables cancel-on-tap-outside", () => {
    const { accountsId, initialize } = makeFakeAccountsId();
    buildIdentityFlowHandle(accountsId, "client-123");

    expect(initialize).toHaveBeenCalledTimes(1);
    const config = initialize.mock.calls[0][0] as {
      client_id: string;
      cancel_on_tap_outside: boolean;
    };
    expect(config.client_id).toBe("client-123");
    expect(config.cancel_on_tap_outside).toBe(false);
  });

  test("promptOneTap() asks GSI to show One Tap exactly once (idempotent)", () => {
    const { accountsId, prompt } = makeFakeAccountsId();
    const handle: IdentityFlowHandle = buildIdentityFlowHandle(accountsId, "cid");

    handle.promptOneTap();
    handle.promptOneTap();
    handle.promptOneTap();

    // The core contract: however often the UI calls it, we only ever ASK Google
    // to show One Tap once (double-prompting is jarring and Google also governs
    // its own cooldowns).
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  test("the notification callback swallows the reason without throwing", () => {
    const { accountsId, prompt } = makeFakeAccountsId();
    const handle: IdentityFlowHandle = buildIdentityFlowHandle(accountsId, "cid");

    // The notification Google passes may expose get*Reason methods. Using a
    // reason-bearing fixture ensures our extraction (`getNotDisplayedReason?()`)
    // survives a real, reason-carrying notification without throwing.
    const notification = {
      getNotDisplayedReason: () => "suppressed_by_user",
    };
    prompt.mockImplementation((cb) => cb?.(notification as never));

    expect(() => handle.promptOneTap()).not.toThrow();
    // It still asked exactly once.
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  test("promptOneTap() tolerates a GSI build with no prompt() at all", () => {
    const accountsId = {
      initialize: vi.fn(),
    } as unknown as GsiAccountsIdLike;
    const handle: IdentityFlowHandle = buildIdentityFlowHandle(accountsId, "cid");

    expect(() => handle.promptOneTap()).not.toThrow();
  });

  test("renderButton() renders with the branded sign-in options", () => {
    const { accountsId, renderButton } = makeFakeAccountsId();
    const handle: IdentityFlowHandle = buildIdentityFlowHandle(accountsId, "cid");

    handle.renderButton(fakeContainer());

    expect(renderButton).toHaveBeenCalledTimes(1);
    const [container, options] = renderButton.mock.calls[0] as unknown as [
      HTMLElement,
      Record<string, unknown>,
    ];
    expect(container).toBeDefined();
    expect(options).toMatchObject({
      type: "standard",
      theme: "filled_black",
      size: "large",
      text: "signin_with",
      shape: "pill",
    });
  });

  test("renderButton() is a no-op when the GSI build lacks renderButton", () => {
    const accountsId = {
      initialize: vi.fn(),
    } as unknown as GsiAccountsIdLike;
    const handle: IdentityFlowHandle = buildIdentityFlowHandle(accountsId, "cid");

    expect(() => handle.renderButton(fakeContainer())).not.toThrow();
  });

  test("onCredential() routes a verified credential to the subscribed handler", () => {
    const { accountsId } = makeFakeAccountsId();
    const handle: IdentityFlowHandle = buildIdentityFlowHandle(accountsId, "cid");
    const handler = vi.fn();

    handle.onCredential(handler);

    // Pull the callback stored in initialize and fire it with a credential.
    const config = (accountsId.initialize as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as { callback: (resp: { status?: string; credential?: string }) => void };
    config.callback({ credential: "jwt-credential" });

    expect(handler).toHaveBeenCalledWith("jwt-credential");
  });

  test("a credential-less callback (suppressed/opt-out) is ignored", () => {
    const { accountsId } = makeFakeAccountsId();
    const handle: IdentityFlowHandle = buildIdentityFlowHandle(accountsId, "cid");
    const handler = vi.fn();

    handle.onCredential(handler);

    const config = (accountsId.initialize as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as { callback: (resp: { status?: string; credential?: string }) => void };
    config.callback({}); // no credential field

    expect(handler).not.toHaveBeenCalled();
  });

  test("an error response routes to onFlowError and never signs in", () => {
    const { accountsId } = makeFakeAccountsId();
    const handle: IdentityFlowHandle = buildIdentityFlowHandle(accountsId, "cid");
    const handler = vi.fn();
    const errorHandler = vi.fn();

    handle.onCredential(handler);
    handle.onFlowError(errorHandler);

    const config = (accountsId.initialize as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as {
      callback: (resp: { error?: string; error_description?: string; credential?: string }) => void;
    };
    config.callback({
      error: "origin_mismatch",
      error_description: "The origin of your web page is not authorized",
    });

    expect(errorHandler).toHaveBeenCalledWith(
      "origin_mismatch",
      "The origin of your web page is not authorized",
    );
    expect(handler).not.toHaveBeenCalled();
  });

  test("a successful credential never triggers onFlowError", () => {
    const { accountsId } = makeFakeAccountsId();
    const handle: IdentityFlowHandle = buildIdentityFlowHandle(accountsId, "cid");
    const errorHandler = vi.fn();

    handle.onFlowError(errorHandler);

    const config = (accountsId.initialize as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as { callback: (resp: { credential?: string }) => void };
    config.callback({ credential: "jwt-credential" });

    expect(errorHandler).not.toHaveBeenCalled();
  });
});

describe("identityFlowErrorToMessage", () => {
  test("maps user-cancelled flows to plain cancellation copy", () => {
    expect(identityFlowErrorToMessage("popup_closed_by_user")).toBe("Sign-in was cancelled.");
    expect(identityFlowErrorToMessage("access_denied")).toBe("Sign-in was cancelled.");
  });

  test("maps origin_mismatch to a registration-hint message", () => {
    expect(identityFlowErrorToMessage("origin_mismatch")).toMatch(/not registered/);
  });

  test("falls back to the error description, then the raw reason", () => {
    expect(identityFlowErrorToMessage("some_error", "Something went sideways.")).toBe(
      "Something went sideways.",
    );
    expect(identityFlowErrorToMessage("some_error")).toBe("some_error");
  });
});

describe("buildCodeFlowTimeoutMessage", () => {
  test("carries the failing origin and the registration hint", () => {
    const message = buildCodeFlowTimeoutMessage("http://192.168.31.179:5173");
    expect(message).toContain("http://192.168.31.179:5173");
    expect(message).toMatch(/registered for Rival/);
  });
});
