import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { keysSecretName, readKeysSecret, writeKeysSecret } from "@/lib/gcpSecret";
import { parseKeys, stripKeys } from "@/lib/keyText";

export interface ApiKey {
  /** Short hash of the key — safe to send to the browser, stable while the key is unchanged. */
  id: string;
  key: string;
}

const KEYS_FILE = path.join(process.cwd(), "keys.csv");

function toApiKeys(raw: string[]): ApiKey[] {
  return [...new Set(raw)].map((key) => ({
    id: createHash("sha256").update(key).digest("hex").slice(0, 12),
    key,
  }));
}

/** The keys secret when one is configured and readable; null means "use the environment variable". */
async function secretText(fresh = false): Promise<string | null> {
  if (!keysSecretName()) return null;
  try {
    return await readKeysSecret({ fresh });
  } catch (error) {
    console.error(
      "Could not read the keys secret, falling back to DECART_API_KEYS:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Every Decart API key available to the app, in order: keys.csv in the project
 * root (re-read on each call, so edits apply without a restart), then the Secret
 * Manager secret named by KEYS_SECRET (or, without one, the DECART_API_KEYS
 * variable), then DECART_API_KEY. Duplicates are dropped.
 */
export async function loadApiKeys(): Promise<ApiKey[]> {
  const csv = await readFile(KEYS_FILE, "utf8").catch(() => "");
  const secret = await secretText();
  return toApiKeys([
    ...parseKeys(csv),
    ...parseKeys(secret ?? process.env.DECART_API_KEYS ?? ""),
    ...parseKeys(process.env.DECART_API_KEY ?? ""),
  ]);
}

export interface RemoveResult {
  /** Ids taken out of at least one store. */
  removed: string[];
  /** Where they were removed from. */
  from: string[];
  /** Ids that could not be removed because they only come from an environment variable. */
  stuck: string[];
  error?: string;
}

/**
 * Takes keys out of every place they are stored: keys.csv and, on Cloud Run, the
 * Secret Manager secret (as a new version, so the old list stays recoverable).
 */
export async function removeKeys(ids: string[]): Promise<RemoveResult> {
  const result: RemoveResult = { removed: [], from: [], stuck: [] };
  if (ids.length === 0) return result;

  const wanted = new Map((await loadApiKeys()).filter((k) => ids.includes(k.id)).map((k) => [k.key, k.id]));
  if (wanted.size === 0) return result;
  const dead = new Set(wanted.keys());
  const gone = new Set<string>();

  const csv = await readFile(KEYS_FILE, "utf8").catch(() => null);
  if (csv !== null) {
    const next = stripKeys(csv, dead);
    if (next !== csv) {
      await writeFile(KEYS_FILE, next, "utf8");
      parseKeys(csv).filter((k) => dead.has(k)).forEach((k) => gone.add(k));
      result.from.push("keys.csv");
    }
  }

  if (keysSecretName()) {
    try {
      const text = (await readKeysSecret({ fresh: true })) ?? "";
      const next = stripKeys(text, dead);
      if (next !== text) {
        await writeKeysSecret(next.trim() ? next : "# no keys left\n");
        parseKeys(text).filter((k) => dead.has(k)).forEach((k) => gone.add(k));
        result.from.push("Secret Manager");
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      console.error("Could not update the keys secret:", result.error);
    }
  }

  for (const [key, id] of wanted) (gone.has(key) ? result.removed : result.stuck).push(id);
  if (result.removed.length) {
    console.log(`Removed ${result.removed.length} exhausted key(s) [${result.removed.join(", ")}] from ${result.from.join(" and ")}`);
  }
  return result;
}

/** Credits the try-on model in fast mode spends per second (see lib/rotatingSession.ts). */
export const CREDITS_PER_SECOND = 4;

/** Seconds of live try-on one key's credits buy; only used for the on-screen estimate. */
export function secondsPerKey(): number {
  const value = Number(process.env.CREDITS_PER_KEY);
  const credits = Number.isFinite(value) && value > 0 ? value : 1000;
  return credits / CREDITS_PER_SECOND;
}
