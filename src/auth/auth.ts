import { Logger } from "@/core/logging/logger";
import { googleClientId, isAuthorizedGoogleOrigin } from "@/core/env";
import { DRIVE_FILE_SCOPE, requestDriveCode, currentOrigin } from "./gsiClient";
import { storeToken, refreshToken, revokeServerToken } from "./driveWorkerClient";
import {
  getStoredSessionToken,
  setStoredSessionToken,
  getStoredIdToken,
  setStoredIdToken,
  decodeIdToken,
  toGoogleUser,
  toGoogleUserFromProfile,
  getStoredIdentity,
  setStoredIdentity,
  subscribeAuthChange,
  validateIdTokenClaims,
  type GoogleUser,
} from "./authSession";
import { driveTokenStore } from "./driveToken";
import { ErrorClassifier } from "@/domain/errors/ErrorClassifier";

export { DRIVE_FILE_SCOPE };
export type { GoogleUser };
export { UNCONFIGURED_MESSAGE } from "./gsiClient";
export { identityFlowErrorToMessage } from "./gsiClient";
export { initIdentityFlow, type IdentityFlowHandle } from "./gsiClient";

/** Complete the identity sign-in process with the given ID token.
 * Update the persisted identity and session state, and return the signed-in user.
 * @throws if the token is invalid or the origin is not authorized.
 */
export function completeIdentitySignIn(idToken: string): GoogleUser {
  const origin = currentOrigin();

  if (!isAuthorizedGoogleOrigin(origin)) {
    throw ErrorClassifier.authDenied(
      `Sign-in is not available at this address (${origin}). Open Rival from an approved address.`,
    );
  }

  const validation = validateIdTokenClaims(idToken, { clientId: googleClientId() });
  if (!validation.ok) {
    throw ErrorClassifier.validation(
      "Google returned an invalid identity token. Please try signing in again.",
      validation.reason,
    );
  }

  const incomingGoogleUser = toGoogleUser(idToken);

  // Cross-account guard: Revoke the previous account's token if the new id_token is for a different `sub`.
  const previousIdToken = getStoredIdToken();
  if (previousIdToken) {
    const previousSub = decodeIdToken(previousIdToken).sub;

    if (previousSub && previousSub !== incomingGoogleUser.uid && hasDriveAccess()) {
      const sessionToken = getStoredSessionToken();

      if (sessionToken) {
        revokeServerToken(sessionToken).catch(() => {
          // Ignore errors: the session may have already been revoked, or the Worker may be down. The important thing is to clear local state
          Logger.auth.warn(
            "completeIdentitySignIn — failed to revoke Drive session for a different account",
            { previousSub, newSub: incomingGoogleUser.uid },
          );
        });
      }

      setStoredSessionToken(null);
      driveTokenStore.clear();
      Logger.auth.warn("completeIdentitySignIn — cleared Drive session for a different account", {
        previousSub,
        newSub: incomingGoogleUser.uid,
      });
    }
  }

  setStoredIdToken(idToken);
  setStoredIdentity({
    uid: incomingGoogleUser.uid,
    email: incomingGoogleUser.email,
    name: incomingGoogleUser.displayName,
    picture: incomingGoogleUser.photoUrl,
  });

  Logger.auth.info("completeIdentitySignIn — identity signed in", {
    uid: incomingGoogleUser.uid,
    email: incomingGoogleUser.email,
  });

  return incomingGoogleUser;
}
/**
 * Connects **Drive only** for the already-signed-in account.
 * Updates the persisted identity and session state, and returns the signed-in user.
 * @throws if the user is not signed in.
 */
export async function connectDrive(): Promise<GoogleUser> {
  const current = getStoredUser();

  if (!current) {
    throw new Error("Sign in with Google first, then connect Drive.");
  }

  const origin = currentOrigin();

  if (!isAuthorizedGoogleOrigin(origin)) {
    throw ErrorClassifier.authDenied(
      `Google Drive connection is not available at this address (${origin}). Open Rival from an approved address.`,
      { surface: { surface: "toast" } },
    );
  }

  /** Request the Drive authorization code. */
  const { code } = await requestDriveCode({
    scope: DRIVE_FILE_SCOPE,
    offline: true, // Request a refresh token
    loginHint: current.uid,
  });

  const { idToken, sessionToken, accessToken, expiresIn } = await storeToken(code);

  setStoredIdToken(idToken);
  setStoredSessionToken(sessionToken);
  driveTokenStore.set(accessToken, expiresIn);

  const user = toGoogleUser(idToken, accessToken);
  setStoredIdentity({
    uid: user.uid,
    email: user.email,
    name: user.displayName,
    picture: user.photoUrl,
  });

  Logger.auth.info("connectDrive — drive connected", { uid: user.uid, email: user.email });

  return user;
}

/** True when the user has a persisted drive session (some refresh capability). */
export function hasDriveAccess(): boolean {
  return getStoredSessionToken() !== null;
}

/** Signs out: revokes the server token + clears local tokens. */
export async function signOut(): Promise<void> {
  const sessionToken = getStoredSessionToken();

  if (sessionToken) {
    await revokeServerToken(sessionToken);
  }

  setStoredSessionToken(null);
  setStoredIdToken(null);
  setStoredIdentity(null);
  driveTokenStore.clear();

  Logger.auth.info("signOut — signed out");
}

/** Observes changes to the authentication state. */
export function observeAuthState(onChange: (user: GoogleUser | null) => void): () => void {
  const emit = () => {
    onChange(userWithToken());
  };
  emit();

  const unsub = subscribeAuthChange(emit);
  const onStorage = () => emit();

  window.addEventListener("storage", onStorage);

  return () => {
    unsub();
    window.removeEventListener("storage", onStorage);
  };
}

/** Returns the current user's identity, or null when no identity is known. */
export function getStoredUser(): GoogleUser | null {
  const idToken = getStoredIdToken();
  if (idToken) {
    return toGoogleUser(idToken); // From cached id_token
  }

  const identity = getStoredIdentity(); // From cached server profile
  return identity ? toGoogleUserFromProfile(identity) : null;
}

/** Returns a valid Drive access token, refreshing via the Worker when missing or expired. */
export async function getDriveAccessToken(): Promise<string> {
  const cached = driveTokenStore.get();
  if (cached) {
    return cached;
  }

  const sessionToken = getStoredSessionToken();
  if (!sessionToken) {
    throw new Error("No signed-in session. Sign in to access Drive.");
  }

  try {
    const { accessToken, expiresIn, profile } = await refreshToken(sessionToken);
    driveTokenStore.set(accessToken, expiresIn);

    if (profile && profile.sub) {
      setStoredIdentity({
        uid: profile.sub,
        email: profile.email,
        name: profile.name,
        picture: profile.picture,
      });
    }

    return accessToken;
  } catch (err) {
    if ((err as { code?: string }).code === "no_refresh_token") {
      throw ErrorClassifier.fromAuthWorkerError(err, { op: "getDriveAccessToken.refresh" });
    }
    throw err;
  }
}

/** Builds the current user, attaching the live cached access token. */
function userWithToken(): GoogleUser | null {
  const user = getStoredUser();
  if (!user) {
    return null;
  }
  const liveAccess = driveTokenStore.get();
  return liveAccess ? { ...user, accessToken: liveAccess } : user;
}
