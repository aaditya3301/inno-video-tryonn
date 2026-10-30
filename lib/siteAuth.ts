import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "tryon_session";
export const SESSION_DAYS = 30;

/** Hashing first makes both sides the same length for a constant-time comparison. */
function same(a: string, b: string): boolean {
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(hash(a), hash(b));
}

/** Whether the site has a password at all. Without SITE_PASSWORD the site is open, which is right for local use. */
export function siteLocked(): boolean {
  return Boolean(process.env.SITE_PASSWORD);
}

export function passwordMatches(given: string): boolean {
  const expected = process.env.SITE_PASSWORD;
  return Boolean(expected) && same(given, expected as string);
}

function sign(expires: number, secret: string): string {
  return createHmac("sha256", secret).update(`livetryon-session:${expires}`).digest("hex");
}

/** The value for the login cookie: an expiry time and a signature only the password holder's server can make. */
export function makeSessionValue(): string {
  const expires = Date.now() + SESSION_DAYS * 86_400_000;
  return `${expires}.${sign(expires, process.env.SITE_PASSWORD as string)}`;
}

function validSession(value: string, secret: string): boolean {
  const [stamp, signature] = value.split(".");
  const expires = Number(stamp);
  if (!signature || !Number.isFinite(expires) || expires < Date.now()) return false;
  return same(signature, sign(expires, secret));
}

function cookie(header: string | null, name: string): string | null {
  for (const part of (header ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

/**
 * Whether a request is allowed in: it carries a valid login cookie, or the password
 * as HTTP Basic auth (so scripts can use `curl -u any:PASSWORD`). Changing
 * SITE_PASSWORD signs everyone out.
 */
export function siteAuthorized(headers: Headers): boolean {
  const secret = process.env.SITE_PASSWORD;
  if (!secret) return true;

  const session = cookie(headers.get("cookie"), SESSION_COOKIE);
  if (session && validSession(session, secret)) return true;

  const auth = headers.get("authorization") ?? "";
  if (!/^basic /i.test(auth)) return false;
  try {
    const decoded = Buffer.from(auth.slice(6).trim(), "base64").toString("utf8");
    return same(decoded.slice(decoded.indexOf(":") + 1), secret);
  } catch {
    return false;
  }
}

/** A path to go to after logging in; anything that isn't a plain path on this site becomes the home page. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}
