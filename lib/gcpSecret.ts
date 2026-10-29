/**
 * Reads and updates the key list kept in Google Secret Manager, using the Cloud Run
 * service account (no extra dependency). Enabled only when KEYS_SECRET names the
 * secret, so local runs and other hosts are unaffected.
 */

const METADATA = "http://metadata.google.internal/computeMetadata/v1";
const SECRET_API = "https://secretmanager.googleapis.com/v1";
/** How long a read is reused, so every request doesn't call Secret Manager. */
const READ_TTL_MS = 30_000;

export function keysSecretName(): string | null {
  return process.env.KEYS_SECRET?.trim() || null;
}

async function metadata(path: string): Promise<string> {
  const res = await fetch(`${METADATA}/${path}`, {
    headers: { "Metadata-Flavor": "Google" },
    signal: AbortSignal.timeout(2_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GCP metadata server answered ${res.status} for ${path}`);
  return res.text();
}

let token: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (token && token.expiresAt > Date.now() + 60_000) return token.value;
  const body = JSON.parse(await metadata("instance/service-accounts/default/token")) as {
    access_token: string;
    expires_in: number;
  };
  token = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return token.value;
}

let project: string | null = null;

async function projectId(): Promise<string> {
  project ??= process.env.GCP_PROJECT?.trim() || (await metadata("project/project-id"));
  return project;
}

async function secretManager(path: string, init?: RequestInit): Promise<Record<string, any>> {
  const res = await fetch(`${SECRET_API}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Secret Manager answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
}

let cached: { text: string; at: number } | null = null;

/** The newest version of the keys secret, or null when no secret is configured. */
export async function readKeysSecret(options: { fresh?: boolean } = {}): Promise<string | null> {
  const name = keysSecretName();
  if (!name) return null;
  if (!options.fresh && cached && Date.now() - cached.at < READ_TTL_MS) return cached.text;

  const body = await secretManager(`projects/${await projectId()}/secrets/${name}/versions/latest:access`);
  const text = Buffer.from(String(body.payload?.data ?? ""), "base64").toString("utf8");
  cached = { text, at: Date.now() };
  return text;
}

/** Saves `text` as a new version of the keys secret; older versions stay for recovery. Returns the version number. */
export async function writeKeysSecret(text: string): Promise<string> {
  const name = keysSecretName();
  if (!name) throw new Error("KEYS_SECRET is not set");

  const body = await secretManager(`projects/${await projectId()}/secrets/${name}:addVersion`, {
    method: "POST",
    body: JSON.stringify({ payload: { data: Buffer.from(text, "utf8").toString("base64") } }),
  });
  cached = { text, at: Date.now() };
  return String(body.name ?? "").split("/").pop() ?? "?";
}
