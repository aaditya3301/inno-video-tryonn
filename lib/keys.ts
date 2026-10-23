import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

export interface ApiKey {
  /** Short hash of the key — safe to send to the browser, stable while the key is unchanged. */
  id: string;
  key: string;
}

const KEYS_FILE = path.join(process.cwd(), "keys.csv");

/** Real keys are long tokens without spaces; this skips headers, labels and notes. */
const KEY_PATTERN = /^[A-Za-z0-9_.\-]{20,}$/;

function parseKeys(text: string): string[] {
  return text
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("#"))
    .flatMap((line) => line.split(/[,;\t]/))
    .map((cell) => cell.trim().replace(/^["']|["']$/g, ""))
    .filter((cell) => KEY_PATTERN.test(cell));
}

/**
 * Every Decart API key available to the app, in order: keys.csv in the project
 * root (re-read on each call, so edits apply without a restart), then the
 * DECART_API_KEYS and DECART_API_KEY environment variables. Duplicates are dropped.
 */
export async function loadApiKeys(): Promise<ApiKey[]> {
  const csv = await readFile(KEYS_FILE, "utf8").catch(() => "");
  const raw = [
    ...parseKeys(csv),
    ...parseKeys(process.env.DECART_API_KEYS ?? ""),
    ...parseKeys(process.env.DECART_API_KEY ?? ""),
  ];
  return [...new Set(raw)].map((key) => ({
    id: createHash("sha256").update(key).digest("hex").slice(0, 12),
    key,
  }));
}

/** Try-on model in fast mode (see lib/rotatingSession.ts). */
const CREDITS_PER_SECOND = 4;

/** Seconds of live try-on one key's credits buy; only used for the on-screen estimate. */
export function secondsPerKey(): number {
  const value = Number(process.env.CREDITS_PER_KEY);
  const credits = Number.isFinite(value) && value > 0 ? value : 1000;
  return credits / CREDITS_PER_SECOND;
}
