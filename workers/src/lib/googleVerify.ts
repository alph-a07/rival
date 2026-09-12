import { createRemoteJWKSet, jwtVerify } from "jose";

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];

const jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

/**
 * The display profile (PII) served back on /refresh so a client whose local
 * id_token/PII cache was wiped can rebuild its identity from server truth.
 */
export interface SessionProfile {
  sub: string;
  email: string | null;
  name: string | null;
  picture: string | null;
}

/**
 * Verifies a Google Identity Services ID token and returns its verified `sub` (the Google account id).
 * Throws on malformed/expired/invalid tokens.
 */
export async function verifyGoogleIdToken(idToken: string, clientId: string): Promise<string> {
  const claims = await verifyGoogleClaimsRaw(idToken, clientId);
  return claims.sub;
}

/** Verifies a Google Identity Services ID token and returns its verified claim set. */
export async function verifyGoogleClaims(
  idToken: string,
  clientId: string,
): Promise<SessionProfile> {
  const claims = await verifyGoogleClaimsRaw(idToken, clientId);
  return claims;
}

async function verifyGoogleClaimsRaw(idToken: string, clientId: string): Promise<SessionProfile> {
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured on the Worker.");
  }

  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: GOOGLE_ISSUERS,
    audience: clientId,
  });

  const sub = payload.sub;
  if (!sub) {
    throw new Error("ID token has no subject.");
  }

  return {
    sub,
    email: typeof payload.email === "string" ? payload.email : null,
    name: typeof payload.name === "string" ? payload.name : null,
    picture: typeof payload.picture === "string" ? payload.picture : null,
  };
}
