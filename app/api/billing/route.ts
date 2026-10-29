import { NextResponse } from "next/server";
import { getBilling } from "@/lib/credits";

// The same numbers as the /billing page, as JSON. Never includes the keys themselves.
export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && new URL(origin).host !== host) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const prune = new URL(request.url).searchParams.get("prune") !== "0";
  return NextResponse.json(await getBilling({ prune }), { headers: { "Cache-Control": "no-store" } });
}
