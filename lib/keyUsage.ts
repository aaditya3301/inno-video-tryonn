/**
 * Per-key usage, kept in localStorage so the countdown survives reloads.
 * Decart has no balance API, so "time left" is an estimate: seconds of live
 * generation counted here against a per-key budget, which is calibrated from
 * the moment a key actually runs out of credits.
 */
export interface KeyUsage {
  /** Seconds of live generation spent on this key. */
  used: number;
  /** Decart ended a session on this key with insufficient_credits. */
  exhausted: boolean;
}

export interface UsageStore {
  keys: Record<string, KeyUsage>;
  /** Seconds the last key actually lasted before running dry. */
  observedBudget?: number;
}

const STORAGE_KEY = "tryon.keyUsage.v1";

export function loadUsage(): UsageStore {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (parsed && typeof parsed.keys === "object") return parsed;
  } catch {
    // Corrupt or unavailable storage — start fresh.
  }
  return { keys: {} };
}

export function saveUsage(store: UsageStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Private mode or full storage — the timer just won't persist.
  }
}

export function usageOf(store: UsageStore, id: string): KeyUsage {
  return (store.keys[id] ??= { used: 0, exhausted: false });
}

export function budgetOf(store: UsageStore, secondsPerKey: number): number {
  return store.observedBudget ?? secondsPerKey;
}

/** Estimated seconds of try-on left across every key that isn't out of credits. */
export function remainingSeconds(store: UsageStore, keyIds: string[], secondsPerKey: number): number {
  const budget = budgetOf(store, secondsPerKey);
  return keyIds.reduce((sum, id) => {
    const usage = store.keys[id];
    if (usage?.exhausted) return sum;
    return sum + Math.max(0, budget - (usage?.used ?? 0));
  }, 0);
}
