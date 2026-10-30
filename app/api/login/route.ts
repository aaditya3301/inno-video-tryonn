import { NextResponse } from "next/server";
import { makeSessionValue, passwordMatches, SESSION_COOKIE, SESSION_DAYS, siteLocked } from "@/lib/siteAuth";

const WINDOW_MS = 10 * 60_000;
const MAX_FAILURES = 10;
/** Wrong passwords per visitor address, within the window. */
const failures = new Map<string, number[]>();

function recent(ip: string): number[] {
  const now = Date.now();
  const list = (failures.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length) failures.set(ip, list);
  else failures.delete(ip);
  return list;
}

/** Checks the site password and, if right, sets a login cookie that lasts 30 days. */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && new URL(origin).host !== host) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!siteLocked()) return NextResponse.json({ ok: true });

  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (recent(ip).length >= MAX_FAILURES) {
    return NextResponse.json({ error: "Too many wrong passwords. Try again in a few minutes." }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as { password?: unknown };
  if (!passwordMatches(String(body.password ?? ""))) {
    failures.set(ip, [...recent(ip), Date.now()]);
    if (failures.size > 5_000) failures.clear();
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(SESSION_COOKIE, makeSessionValue(), {
    httpOnly: true,
    secure: request.headers.get("x-forwarded-proto") === "https",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  return response;
}
