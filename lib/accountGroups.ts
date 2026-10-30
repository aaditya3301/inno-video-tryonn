/** Who owns each key, as far as we know. `account` is null when it couldn't be worked out. */
interface Owned {
  account: string | null;
}

/**
 * For each key, the position of an earlier key on the same account (or null when
 * it is the first of its account), and how many distinct accounts there are.
 * A key whose account is unknown counts as an account of its own.
 */
export function groupAccounts(items: Owned[]): { sameAs: (number | null)[]; accounts: number } {
  const first = new Map<string, number>();
  let accounts = 0;
  const sameAs = items.map((item, index) => {
    if (!item.account) {
      accounts++;
      return null;
    }
    const seen = first.get(item.account);
    if (seen === undefined) {
      first.set(item.account, index);
      accounts++;
      return null;
    }
    return seen;
  });
  return { sameAs, accounts };
}

/**
 * Credits and whole seconds with each account counted once. Keys on one account
 * show one shared balance, so the highest figure among them stands for the account
 * (a key with its own spending cap can show less than the account really has).
 */
export function countOncePerAccount(
  items: (Owned & { credits: number | null })[],
  creditsPerSecond: number,
): { credits: number; seconds: number } {
  const best = new Map<string, number>();
  let credits = 0;
  let seconds = 0;
  const add = (c: number) => {
    credits += c;
    seconds += Math.floor(c / creditsPerSecond);
  };
  for (const item of items) {
    const c = item.credits ?? 0;
    if (item.account) best.set(item.account, Math.max(best.get(item.account) ?? 0, c));
    else add(c);
  }
  for (const c of best.values()) add(c);
  return { credits, seconds };
}

/** The 1-based position of the first existing key that is on the same account as a new one, or null. */
export function findSameAccount(existingAccounts: (string | undefined)[], mine: string | undefined): number | null {
  if (!mine) return null;
  const index = existingAccounts.findIndex((account) => account === mine);
  return index >= 0 ? index + 1 : null;
}
