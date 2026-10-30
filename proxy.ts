import { NextResponse, type NextRequest } from "next/server";
import { safeNext, siteAuthorized } from "@/lib/siteAuth";

/**
 * Locks the site behind SITE_PASSWORD, so only people you give it to can open the
 * page or start a try-on (every session spends Decart credits). Pages send visitors
 * to /login; API calls get a 401. The credit-related routes check the password
 * again themselves, so this file is not the only lock.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/login" || pathname === "/api/login" || siteAuthorized(request.headers)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/") || (request.method !== "GET" && request.method !== "HEAD")) {
    return NextResponse.json({ error: "Password required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  // Next.js needs a full address here. Build it from the host the visitor used (behind
  // Cloud Run the request's own url shows the container, not your domain).
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const proto = request.headers.get("x-forwarded-proto") ?? (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
  const login = `${proto}://${host}/login?next=${encodeURIComponent(safeNext(pathname + search))}`;
  return NextResponse.redirect(login, { status: 307, headers: { "Cache-Control": "no-store" } });
}

export const config = {
  // Everything except files that are safe to share: the ones the login page needs, and the
  // garment photos. The photos have to stay open because the image resizer (_next/image)
  // fetches each one itself, without the visitor's login cookie.
  matcher: ["/((?!_next/static|_next/image|icon\\.png|apple-icon\\.png|logo\\.png|garments/).*)"],
};
