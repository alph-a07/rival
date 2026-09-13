import { Logger } from "@/core/logging/logger";
import { Ok, Err, type Result } from "@/domain/errors/Result";
import { ErrorClassifier } from "@/domain/errors/ErrorClassifier";
import { isAppError } from "@/domain/errors/AppError";
import { pickAuthoritative } from "./driveDedup";

/** Supplies a valid, current Drive OAuth access token paired with invalidate. */
type AccessTokenProvider = () => Promise<{ token: string; invalidate: () => void }>;

/** The result of a successful Drive export, including the authoritative file. */
interface DriveSyncResult {
  fileId: string;
  name: string;
}

/** A `rival-backup.json` that exists in the user's Drive right now. */
interface BackupFileRef {
  id: string;
  name: string;
  /** Immutable Drive creation time — the global ordering anchor for dedup. */
  createdAt: string;
}

/** An error thrown when a Drive request fails, with status and optional Retry-After. */
class DriveRequestError extends Error {
  readonly status: number;
  readonly retryAfterSeconds: number | null;

  constructor(status: number, body: string, retryAfterSeconds: number | null = null) {
    const detail = body ? `: ${body.slice(0, 500)}` : "";

    super(`Drive request failed (${status})${detail}`);

    this.name = "DriveRequestError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** A Drive file's metadata as returned by the Drive API. */
interface ListItem {
  id?: string;
  name?: string;
  createdTime?: string;
}

/**
 * Uploads the given JSON payload as `rival-backup.json`.
 * Converges duplicates and retries transient failures (401 / 429 / 5xx) with backoff.
 * Returns the authoritative file's id and name on success.
 */
export async function exportToDrive(
  getToken: AccessTokenProvider,
  payload: unknown,
): Promise<Result<DriveSyncResult>> {
  try {
    const { multipart, media } = buildMultipartUpload(payload);
    const priorBackupList = await listBackups(getToken);

    // Prior backups exist: overwrite the authoritative one and trash the rest.
    if (priorBackupList.length > 0) {
      const survivor = pickAuthoritative(priorBackupList)!;
      const target = survivor.id;

      if (survivor.trashed.length > 0) {
        await trashDuplicates(getToken, priorBackupList);
      }

      const etag = await metadataEtagFor(getToken, target);
      const uploaded = (await driveJson(
        getToken,
        `${UPLOAD_API}/${encodeURIComponent(target)}?uploadType=multipart`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": uploadContentType(),
            ...(etag ? { "If-Match": etag } : {}),
          },
          body: multipart,
        },
      )) as { id: string; name: string };

      Logger.sync.info("exportToDrive — uploaded (overwrite)", {
        fileId: uploaded.id,
        bytes: media.length,
        trashed: survivor.trashed.length,
      });

      return Ok({ fileId: uploaded.id, name: uploaded.name });
    }

    // No backup yet: create one and converge duplicates if a concurrent tab beat us to it.
    const created = (await driveJson(getToken, `${UPLOAD_API}?uploadType=multipart`, {
      method: "POST",
      headers: { "Content-Type": uploadContentType() },
      body: multipart,
    })) as { id: string; name: string };

    const backupList = await listBackups(getToken);

    if (backupList.length > 1) {
      await trashDuplicates(getToken, backupList);
      const survivor = pickAuthoritative(backupList)!;

      if (survivor.id !== created.id) {
        // A concurrent tab beat us to bootstrap: keep the payload authoritative.
        const etag = await metadataEtagFor(getToken, survivor.id);
        await driveJson(
          getToken,
          `${UPLOAD_API}/${encodeURIComponent(survivor.id)}?uploadType=multipart`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": uploadContentType(),
              ...(etag ? { "If-Match": etag } : {}),
            },
            body: multipart,
          },
        );

        Logger.sync.info("exportToDrive — re-homed onto surviving backup", {
          fileId: survivor.id,
          afterRace: true,
        });

        return Ok({ fileId: survivor.id, name: BACKUP_FILENAME });
      }
    }

    Logger.sync.info("exportToDrive — created", { fileId: created.id, bytes: media.length });

    return Ok({ fileId: created.id, name: created.name });
  } catch (e) {
    return Err(
      isAppError(e)
        ? e
        : ErrorClassifier.fromDriveApiError(e, { entity: "Drive", op: "exportToDrive" }),
    );
  }
}

/**
 * Downloads the app's backup JSON from Drive.
 * Converges duplicates and retries transient failures (401 / 429 / 5xx) with backoff.
 * Returns the parsed JSON on success.
 */
export async function importFromDrive(getToken: AccessTokenProvider): Promise<Result<unknown>> {
  try {
    const candidates = await listBackups(getToken);
    if (candidates.length > 1) {
      await trashDuplicates(getToken, candidates);
    }

    const survivor = pickAuthoritative(candidates);
    const id = survivor?.id;
    if (!id) {
      return Err(ErrorClassifier.notFound("backup", "Drive"));
    }

    const data = await driveJson(getToken, `${DRIVE_API}/${encodeURIComponent(id)}?alt=media`);
    Logger.sync.info("importFromDrive — downloaded", {
      fileId: id,
      bytes: JSON.stringify(data).length,
    });

    return Ok(data);
  } catch (e) {
    return Err(
      isAppError(e)
        ? e
        : ErrorClassifier.fromDriveApiError(e, { entity: "Drive", op: "importFromDrive" }),
    );
  }
}

/** Lists every surviving `rival-backup.json`, oldest first (stable Drive order). */
async function listBackups(getToken: AccessTokenProvider): Promise<BackupFileRef[]> {
  // Replace spaces with `+` and encode the whole query
  const encodedQ = encodeURIComponent(backupExistsQuery()).replace(/%20/g, "+");

  const result = (await driveJson(
    getToken,
    `${DRIVE_API}?q=${encodedQ}&orderBy=createdTime&fields=files(id,name,createdTime)&spaces=drive`,
  )) as { files?: ListItem[] };

  return (result.files ?? [])
    .filter((f) => typeof f.id === "string")
    .map((f) => ({
      id: f.id as string,
      name: f.name ?? BACKUP_FILENAME,
      createdAt: typeof f.createdTime === "string" ? f.createdTime : "",
    }));
}

/** Moves a Drive file to the trash. */
function moveToTrash(getToken: AccessTokenProvider, id: string): Promise<unknown> {
  return driveJson(getToken, `${DRIVE_API}/${encodeURIComponent(id)}?fields=id`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trashed: true }),
  });
}

/** The metadata resource's current ETag for the file. */
async function metadataEtagFor(getToken: AccessTokenProvider, id: string): Promise<string | null> {
  const meta = await driveJsonWithMetadata(
    getToken,
    `${DRIVE_API}/${encodeURIComponent(id)}?fields=id,name,headRevisionId`,
  );

  return meta.etag;
}

/** Trashes every backup except the deterministic winner. Best-effort. */
async function trashDuplicates(
  getToken: AccessTokenProvider,
  candidates: BackupFileRef[],
): Promise<void> {
  const survivor = pickAuthoritative(candidates);

  if (!survivor) {
    return;
  }

  for (const id of survivor.trashed) {
    try {
      await moveToTrash(getToken, id);
      Logger.sync.info("exportToDrive — trashed stale backup duplicate", { fileId: id });
    } catch {
      Logger.sync.warn("exportToDrive — failed to trash stale backup duplicate", { fileId: id });
    }
  }
}

/** The multipart upload body shared by create and overwrite. */
function buildMultipartUpload(payload: unknown): { multipart: string; media: string } {
  const metadata = JSON.stringify({ name: BACKUP_FILENAME, mimeType: "application/json" });
  const media = JSON.stringify(payload);

  const multipart =
    `--${UPLOAD_BOUNDARY}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${metadata}\r\n` +
    `--${UPLOAD_BOUNDARY}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${media}\r\n` +
    `--${UPLOAD_BOUNDARY}--`;

  return { multipart, media };
}

/** Fetches a Drive JSON response, throwing on non-OK. */
async function driveJson(getToken: AccessTokenProvider, url: string, init?: RequestInit) {
  const result = await driveJsonWithMetadata(getToken, url, init);
  return result.data;
}

/** Fetches a Drive JSON response and its validator, throwing on non-OK. */
async function driveJsonWithMetadata(
  getToken: AccessTokenProvider,
  url: string,
  init?: RequestInit,
): Promise<{ data: unknown; etag: string | null }> {
  return withTokenRetry(getToken, async (accessToken) => {
    const response = await fetch(url, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");

      const retryAfterRaw = response.headers.get("Retry-After");
      const retryAfterSeconds =
        retryAfterRaw && /^\d+$/.test(retryAfterRaw) ? Number(retryAfterRaw) : null;

      throw new DriveRequestError(response.status, body, retryAfterSeconds);
    }

    return { data: (await response.json()) as unknown, etag: response.headers.get("ETag") };
  });
}

/** Retries a request with a token, generating a new one if necessary. */
async function withTokenRetry<T>(
  getToken: AccessTokenProvider,
  request: (accessToken: string) => Promise<T>,
): Promise<T> {
  const attempts = Array.from({ length: MAX_RETRIES }, (_, i) => i + 1);

  for (const attempt of attempts) {
    const { token, invalidate } = await getToken();

    try {
      return await request(token);
    } catch (err) {
      if (!(err instanceof DriveRequestError)) {
        throw err;
      }

      if (err.status === 401) {
        if (attempt === attempts.length) {
          throw err;
        }

        Logger.sync.info("withTokenRetry — token expired, refreshing and retrying");
        invalidate();
        continue;
      }

      if (err.status === 429 || err.status >= 500) {
        if (attempt === attempts.length) {
          throw err;
        }

        const delay = retryDelayMs(attempt, err.retryAfterSeconds);
        Logger.sync.warn(`withTokenRetry — transient ${err.status}, retrying in ${delay}ms`, {
          attempt,
          status: err.status,
        });
        await sleep(delay);
        continue;
      }

      throw err;
    }
  }

  throw new Error("Drive request exceeded retry limit.");
}

/** Calculates the delay before retrying a request based on the attempt number and the Retry-After header. */
function retryDelayMs(attempt: number, retryAfterSeconds: number | null): number {
  if (retryAfterSeconds != null && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  const base = 300 * 2 ** (attempt - 1);
  const jitter = Math.floor(Math.random() * base * 0.5);
  return base + jitter;
}

/** Formats a string for use in a Google Drive query.
 *
 * Replaces single quotes with escaped single quotes.
 * Wraps the value in single quotes.
 */
function quoteQ(value: string): string {
  return `'${value.replace(/'/g, "\\'")}'`;
}

/** Returns a Drive query string that matches the app's backup file. */
function backupExistsQuery(): string {
  return `name=${quoteQ(BACKUP_FILENAME)} and trashed=false`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const BACKUP_FILENAME = "rival-backup.json";
const DRIVE_API = "https://www.googleapis.com/drive/v3/files";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";
const UPLOAD_BOUNDARY = "rival-sync-boundary";
const uploadContentType = () => `multipart/related; boundary=${UPLOAD_BOUNDARY}`;
const MAX_RETRIES = 3;
