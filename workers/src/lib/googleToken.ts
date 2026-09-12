const TOKEN_URL = "https://oauth2.googleapis.com/token";

/**
 * Exchanges a GSI OAuth code for a refresh token + access token + id_token.
 *
 * For a GSI `popup` (ux_mode: popup) flow the redirect_uri is `postmessage`.
 */
export async function exchangeCodeForRefreshToken(
  code: string,
  redirectUri: string,
  opts: GoogleTokenOpts,
): Promise<{ refreshToken: string; accessToken: string; expiresIn: number; idToken: string }> {
  const parsed = await postToken(
    {
      grant_type: "authorization_code",
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      code,
      redirect_uri: redirectUri,
    },
    opts,
  );

  if (!parsed.refresh_token) {
    throw new Error(
      "Google did not issue a refresh token. Sign-in must use access_type=offline with a consent prompt.",
    );
  }

  if (!parsed.id_token) {
    throw new Error(
      "Google did not return an id_token. Request the 'openid' scope in the code flow.",
    );
  }

  return {
    refreshToken: parsed.refresh_token,
    accessToken: parsed.access_token ?? "",
    expiresIn: parsed.expires_in ?? 3600,
    idToken: parsed.id_token,
  };
}

/** Refreshes a Google access token using a refresh token. */
export async function refreshAccessToken(
  refreshToken: string,
  opts: GoogleTokenOpts,
  scope: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const parsed = await postToken(
    {
      grant_type: "refresh_token",
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      refresh_token: refreshToken,
      scope,
    },
    opts,
  );

  if (!parsed.access_token) {
    throw new Error("Google returned no access_token for the provided refresh token.");
  }

  return { accessToken: parsed.access_token, expiresIn: parsed.expires_in ?? 3600 };
}

/** Revokes a Google refresh token server-side. Best-effort; ignored on error. */
export async function revokeToken(refreshToken: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

/** Posts a form body to Google's token endpoint and parses the response. */
async function postToken(
  body: Record<string, string>,
  _opts: GoogleTokenOpts,
): Promise<AccessTokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });

  const text = await response.text();
  let parsed: AccessTokenResponse = {};
  try {
    parsed = text ? (JSON.parse(text) as AccessTokenResponse) : {};
  } catch {
    // non-JSON; leave empty so the `!ok` path throws below
  }

  if (!response.ok) {
    const textDetail = text.slice(0, 200);
    throw new Error(
      `Google token exchange failed (${response.status}): ${textDetail || "unknown"}`,
    );
  }

  return parsed;
}

interface AccessTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

interface GoogleTokenOpts {
  clientId: string;
  clientSecret: string;
}
