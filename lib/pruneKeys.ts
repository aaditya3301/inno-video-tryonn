const MIN_GAP_MS = 10_000;
let lastAsked = 0;

/**
 * Asks the server to check every key's credits and remove the ones at zero from
 * the key store. Fire and forget: it runs on page load, on Start, and whenever a
 * key runs dry, so empty keys disappear without anyone opening /billing.
 */
export function pruneEmptyKeys(): void {
  if (Date.now() - lastAsked < MIN_GAP_MS) return;
  lastAsked = Date.now();
  fetch("/api/billing", { cache: "no-store" }).catch(() => {});
}
