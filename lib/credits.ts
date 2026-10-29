import { CREDITS_PER_SECOND, loadApiKeys, removeKeys, type ApiKey, type RemoveResult } from "@/lib/keys";

const CREDITS_URL = "https://api.decart.ai/v1/credits";
/** Decart asks for at most one credits call per second per key; reuse a result for a few seconds. */
const CACHE_MS = 5_000;
/** A key with fewer credits than this is removed. Default 1 means "removed when it hits zero". */
const REMOVE_BELOW = Math.max(1, Number(process.env.REMOVE_BELOW_CREDITS) || 1);

export type KeyStatus = "ok" | "low" | "empty" | "invalid" | "error";

export interface KeyBalance {
  /** Short hash of the key, never the key itself. */
  id: string;
  credits: number | null;
  /** Whole seconds of live try-on these credits pay for. */
  seconds: number | null;
  status: KeyStatus;
  note?: string;
  removed?: boolean;
}

export interface Billing {
  checkedAt: string;
  keys: KeyBalance[];
  /** Credits across the keys that are still in the pool. */
  totalCredits: number;
  /** Seconds across the keys still in the pool; each key's leftover under one second is not counted. */
  totalSeconds: number;
  keysInPool: number;
  /** What was taken out of the key list on this check, and from where. */
  removal: RemoveResult;
}

async function fetchBalance({ id, key }: ApiKey): Promise<KeyBalance> {
  try {
    const res = await fetch(CREDITS_URL, {
      headers: { "x-api-key": key },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (res.status === 401) {
      return { id, credits: null, seconds: null, status: "invalid", note: "Decart rejected this key" };
    }
    if (res.status === 403) {
      return { id, credits: null, seconds: null, status: "invalid", note: "This is a client token, not an API key" };
    }
    if (!res.ok) {
      return { id, credits: null, seconds: null, status: "error", note: `Decart answered ${res.status}` };
    }
    const credits = Number(((await res.json()) as { credits?: unknown }).credits);
    if (!Number.isInteger(credits) || credits < 0) {
      return { id, credits: null, seconds: null, status: "error", note: "Unexpected answer from Decart" };
    }
    const seconds = Math.floor(credits / CREDITS_PER_SECOND);
    const status: KeyStatus = credits < REMOVE_BELOW ? "empty" : seconds < 1 ? "low" : "ok";
    return { id, credits, seconds, status };
  } catch {
    return { id, credits: null, seconds: null, status: "error", note: "Could not reach Decart" };
  }
}

async function check(prune: boolean): Promise<Billing> {
  const keys = await loadApiKeys();
  const balances = await Promise.all(keys.map(fetchBalance));

  // Only a clean "0 credits" answer removes a key; errors and rejections never do.
  const empty = balances.filter((b) => b.status === "empty").map((b) => b.id);
  const removal: RemoveResult = prune ? await removeKeys(empty) : { removed: [], from: [], stuck: [] };
  for (const b of balances) {
    if (removal.removed.includes(b.id)) b.removed = true;
    else if (removal.stuck.includes(b.id)) b.note = "Remove it from the DECART_API_KEYS variable by hand";
  }

  const live = balances.filter((b) => !b.removed);
  return {
    checkedAt: new Date().toISOString(),
    keys: balances,
    totalCredits: live.reduce((sum, b) => sum + (b.credits ?? 0), 0),
    totalSeconds: live.reduce((sum, b) => sum + (b.seconds ?? 0), 0),
    keysInPool: live.length,
    removal,
  };
}

const cache = new Map<boolean, { at: number; result: Promise<Billing> }>();

/**
 * Asks Decart how many credits every key has left. With `prune`, keys that are at
 * zero are also removed from the key store. Results are reused for a few seconds
 * so refreshing the page can't hammer Decart.
 */
export function getBilling({ prune }: { prune: boolean }): Promise<Billing> {
  const hit = cache.get(prune);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.result;
  const result = check(prune);
  cache.set(prune, { at: Date.now(), result });
  result.catch(() => cache.delete(prune));
  return result;
}
