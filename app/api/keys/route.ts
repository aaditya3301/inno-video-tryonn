import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { findSameAccount } from "@/lib/accountGroups";
import { accountsOf } from "@/lib/accounts";
import { clearBillingCache, fetchBalance } from "@/lib/credits";
import { KEY_PATTERN } from "@/lib/keyText";
import { addKey, CREDITS_PER_SECOND, KeyStoreError, loadApiKeys, toApiKey } from "@/lib/keys";

const WINDOW_MS = 10 * 60_000;
/** Requests that got as far as asking Decart about a key. */
const attempts: number[] = [];
/** Wrong passwords. */
const badPasswords: number[] = [];

function tooMany(list: number[], max: number): boolean {
  const now = Date.now();
  while (list.length && now - list[0] > WINDOW_MS) list.shift();
  return list.length >= max;
}

function passwordMatches(given: string, expected: string): boolean {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

/**
 * Adds one Decart API key to the key store. The key is checked with Decart first,
 * so junk and empty keys are refused. If BILLING_PASSWORD is set it must be sent
 * too. The key is never logged or sent back; only its short id.
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && new URL(origin).host !== host) return fail("Forbidden", 403);

  const body = (await request.json().catch(() => ({}))) as {
    key?: unknown;
    password?: unknown;
    confirm?: unknown;
  };

  const required = process.env.BILLING_PASSWORD;
  if (required) {
    if (tooMany(badPasswords, 10)) return fail("Too many wrong passwords. Try again in a few minutes.", 429);
    if (!passwordMatches(String(body.password ?? ""), required)) {
      badPasswords.push(Date.now());
      return fail("Wrong password.", 401);
    }
  }

  const key = String(body.key ?? "").trim().replace(/^["']|["']$/g, "");
  if (!KEY_PATTERN.test(key)) {
    return fail("That doesn't look like an API key. Paste just the key, with no spaces.", 400);
  }

  if (tooMany(attempts, 20)) return fail("Too many tries. Wait a few minutes and try again.", 429);
  attempts.push(Date.now());

  const balance = await fetchBalance({ id: "", key });
  if (balance.status === "invalid") return fail("Decart rejected this key, so it wasn't saved.", 400);
  if (balance.status === "error") return fail("Couldn't reach Decart to check this key. Try again in a moment.", 502);
  if (balance.status !== "ok") return fail("This key has no usable credits left, so it wasn't saved.", 400);

  // A key on a Decart account we already have shares that balance and adds no time:
  // say so and let the person decide, unless they have already confirmed.
  if (body.confirm !== true) {
    const existing = await loadApiKeys();
    if (!existing.some((k) => k.key === key)) {
      const candidate = toApiKey(key);
      const accounts = await accountsOf([...existing, candidate]);
      const sameAs = findSameAccount(
        existing.map((k) => accounts.get(k.id)),
        accounts.get(candidate.id),
      );
      if (sameAs) {
        return NextResponse.json(
          {
            sameAccount: true,
            sameAs,
            error: `This key is on the same Decart account as Key ${sameAs}, so it shares that balance and adds no extra time.`,
          },
          { status: 409 },
        );
      }
    }
  }

  try {
    const result = await addKey(key);
    clearBillingCache();
    return NextResponse.json(
      {
        added: result.added,
        id: result.id,
        credits: balance.credits,
        seconds: balance.seconds,
        creditsPerSecond: CREDITS_PER_SECOND,
        keysNow: (await loadApiKeys()).length,
        savedTo: result.to,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof KeyStoreError) return fail(error.message, 500);
    console.error("Could not save a key:", error instanceof Error ? error.message : error);
    return fail("The key is valid but couldn't be saved to the key store. Check the server log.", 502);
  }
}
