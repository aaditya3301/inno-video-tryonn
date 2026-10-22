import { createDecartClient } from "@decartai/sdk";
import { NextResponse } from "next/server";

// Mints a short-lived client token so the permanent DECART_API_KEY never
// reaches the browser.
export async function POST(request: Request) {
  // Refuse cross-site callers so other websites can't spend your credits
  // through this endpoint. Same-origin fetches always send a matching Origin.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && new URL(origin).host !== host) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apiKey = process.env.DECART_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "DECART_API_KEY is not set. Add it to .env.local (or your Vercel project's environment variables) and restart.",
      },
      { status: 500 },
    );
  }

  try {
    const client = createDecartClient({ apiKey });
    // Minted fresh on every connect; the session keeps running after expiry.
    const token = await client.tokens.create({ expiresIn: 300 });
    return NextResponse.json(token, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to create Decart client token:", error);
    return NextResponse.json(
      { error: "Could not create a session token. Check that your DECART_API_KEY is valid." },
      { status: 502 },
    );
  }
}
