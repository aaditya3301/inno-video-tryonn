import { createDecartClient } from "@decartai/sdk";
import { NextResponse } from "next/server";
import { accountsOf } from "@/lib/accounts";
import { loadApiKeys, secondsPerKey } from "@/lib/keys";
import { siteAuthorized } from "@/lib/siteAuth";

const NO_KEYS_ERROR =
  "No API keys found. Add them to keys.csv (one per line), then try again.";

// Refuse cross-site callers so other websites can't spend your credits
// through this endpoint. Same-origin fetches always send a matching Origin.
function isCrossSite(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  return !!origin && new URL(origin).host !== host;
}

// Lists the key pool (hashed ids only) so the browser can rotate through it
// and estimate how much try-on time is left.
export async function GET(request: Request) {
  if (!siteAuthorized(request.headers)) return NextResponse.json({ error: "Password required" }, { status: 401 });
  if (isCrossSite(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const keys = await loadApiKeys();
  // Which keys share a Decart account, so a switch never lands on a key with the same empty balance.
  const accounts = await accountsOf(keys, 4_000);
  return NextResponse.json(
    {
      keyIds: keys.map((k) => k.id),
      secondsPerKey: secondsPerKey(),
      accounts: Object.fromEntries(accounts),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// Mints a short-lived client token for one key in the pool so the permanent
// keys never reach the browser.
export async function POST(request: Request) {
  if (!siteAuthorized(request.headers)) return NextResponse.json({ error: "Password required" }, { status: 401 });
  if (isCrossSite(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const keys = await loadApiKeys();
  if (keys.length === 0) {
    return NextResponse.json({ error: NO_KEYS_ERROR }, { status: 500 });
  }

  const { keyId } = (await request.json().catch(() => ({}))) as { keyId?: string };
  const entry = keyId ? keys.find((k) => k.id === keyId) : keys[0];
  if (!entry) {
    return NextResponse.json({ error: "That API key is no longer in keys.csv." }, { status: 404 });
  }

  try {
    const client = createDecartClient({ apiKey: entry.key });
    // Minted fresh on every connect; the session keeps running after expiry.
    const token = await client.tokens.create({ expiresIn: 300 });
    return NextResponse.json({ ...token, keyId: entry.id }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(`Failed to create Decart client token for key ${entry.id}:`, error);
    return NextResponse.json(
      { error: "Could not create a session token. Check that this API key is valid." },
      { status: 502 },
    );
  }
}
