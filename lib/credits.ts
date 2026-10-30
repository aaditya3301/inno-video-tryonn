import { countOncePerAccount, groupAccounts } from "@/lib/accountGroups";
import { accountsOf } from "@/lib/accounts";
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
  /** Short hash of the Decart account that owns the key, when it could be worked out. */
  account?: string;
  /** 1-based position of an earlier key on the same account. Such a key shares that balance. */
  sameAs?: number;
}

export interface Billing {
  checkedAt: string;
  keys: KeyBalance[];
  /** Credits across the keys still in the pool, each account counted once. */
  totalCredits: number;
  /** Seconds across the keys still in the pool, each account counted once; a leftover under one second is not counted. */
  totalSeconds: number;
  keysInPool: number;
  /** Distinct Decart accounts among the keys still in the pool. */
  accountsInPool: number;
  /** What was taken out of the key list on this check, and from where. */
  removal: RemoveResult;
}

export async function fetchBalance({ id, key }: ApiKey): Promise<KeyBalance> {
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
  const [balances, accounts] = await Promise.all([Promise.all(keys.map(fetchBalance)), accountsOf(keys)]);
  for (const b of balances) b.account = accounts.get(b.id);
  groupAccounts(balances.map((b) => ({ account: b.account ?? null }))).sameAs.forEach((first, i) => {
    if (first !== null) balances[i].sameAs = first + 1;
  });

  // Only a clean "0 credits" answer removes a key; errors and rejections never do.
  const empty = balances.filter((b) => b.status === "empty").map((b) => b.id);
  const removal: RemoveResult = prune ? await removeKeys(empty) : { removed: [], from: [], stuck: [] };
  for (const b of balances) {
    if (removal.removed.includes(b.id)) b.removed = true;
    else if (removal.stuck.includes(b.id)) b.note = "Remove it from the DECART_API_KEYS variable by hand";
  }

  const live = balances.filter((b) => !b.removed);
  const totals = countOncePerAccount(
    live.map((b) => ({ account: b.account ?? null, credits: b.credits })),
    CREDITS_PER_SECOND,
  );
  return {
    checkedAt: new Date().toISOString(),
    keys: balances,
    totalCredits: totals.credits,
    totalSeconds: totals.seconds,
    keysInPool: live.length,
    accountsInPool: groupAccounts(live.map((b) => ({ account: b.account ?? null }))).accounts,
    removal,
  };
}

const cache = new Map<boolean, { at: number; result: Promise<Billing> }>();

/** Forget recent results, e.g. right after a key was added so the page shows it at once. */
export function clearBillingCache(): void {
  cache.clear();
}

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
