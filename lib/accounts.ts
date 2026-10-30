import { createHash } from "node:crypto";
import { createDecartClient, decodeClientToken } from "@decartai/sdk";
import type { ApiKey } from "@/lib/keys";

/** Key id to account id. A key's owner never changes, so a result is kept for the life of the server. */
const known = new Map<string, string>();

/**
 * Works out which Decart account owns a key. A client token minted from the key
 * names its owner (the organisation for organisation keys), so one short-lived
 * token is enough. Only a hash of that id is kept or shown.
 */
async function lookup(key: ApiKey): Promise<void> {
  if (known.has(key.id)) return;
  try {
    const token = await createDecartClient({ apiKey: key.key }).tokens.create({ expiresIn: 60 });
    const claims = decodeClientToken(token.token ?? token.apiKey);
    const owner = claims.organizationId ?? claims.userId;
    if (owner) known.set(key.id, createHash("sha256").update(owner).digest("hex").slice(0, 12));
  } catch {
    // Leave it unknown; it is tried again next time.
  }
}

/**
 * Account id for each key id that could be worked out. Waits at most `timeoutMs`,
 * so a slow Decart never holds a page up; anything still pending shows up next time.
 */
export async function accountsOf(keys: ApiKey[], timeoutMs = 8_000): Promise<Map<string, string>> {
  await Promise.race([
    Promise.all(keys.map(lookup)),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
  const result = new Map<string, string>();
  for (const key of keys) {
    const account = known.get(key.id);
    if (account) result.set(key.id, account);
  }
  return result;
}
