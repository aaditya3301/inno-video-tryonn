import type { Metadata } from "next";
import { getBilling, type KeyStatus } from "@/lib/credits";
import { CREDITS_PER_SECOND } from "@/lib/keys";
import AddKeyDialog from "./AddKeyDialog";
import styles from "./billing.module.css";

export const metadata: Metadata = {
  title: "Billing · Live Try-On",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<KeyStatus, string> = {
  ok: "OK",
  low: "Under 1 s",
  empty: "Empty",
  invalid: "Rejected",
  error: "Couldn't check",
};

const number = new Intl.NumberFormat("en-IN");

function duration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { prune } = await searchParams;
  const billing = await getBilling({ prune: prune !== "0" });

  const checked = new Date(billing.checkedAt).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const removedCount = billing.keys.filter((k) => k.removed).length;

  return (
    <main className={styles.page}>
      <a className={styles.back} href="/">
        ← Live Try-On
      </a>
      <div className={styles.head}>
        <h1 className={styles.title}>Billing</h1>
        <AddKeyDialog passwordRequired={Boolean(process.env.BILLING_PASSWORD)} />
      </div>
      <p className={styles.sub}>
        Every key was asked for its credits at {checked} IST. Refresh the page to check again.
      </p>

      <section className={styles.totals} aria-label="Totals">
        <div className={styles.total}>
          <span className={styles.label}>Time left</span>
          <strong className={styles.big}>{duration(billing.totalSeconds)}</strong>
          <span className={styles.hint}>at {CREDITS_PER_SECOND} credits per second</span>
        </div>
        <div className={styles.total}>
          <span className={styles.label}>Credits left</span>
          <strong className={styles.big}>{number.format(billing.totalCredits)}</strong>
          <span className={styles.hint}>
            {billing.accountsInPool < billing.keysInPool
              ? `across ${billing.accountsInPool} ${billing.accountsInPool === 1 ? "account" : "accounts"} (${billing.keysInPool} keys, shared balances counted once)`
              : `across ${billing.keysInPool} ${billing.keysInPool === 1 ? "key" : "keys"}`}
          </span>
        </div>
      </section>

      {removedCount > 0 && (
        <p className={styles.notice}>
          Removed {removedCount} empty {removedCount === 1 ? "key" : "keys"} from{" "}
          {billing.removal.from.join(" and ") || "the key list"}.
        </p>
      )}
      {billing.removal.error && (
        <p className={`${styles.notice} ${styles.noticeBad}`}>
          Couldn't update the key list: {billing.removal.error}
        </p>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Key</th>
              <th className={styles.num}>Credits</th>
              <th className={styles.num}>Time left</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {billing.keys.map((key, index) => (
              <tr key={key.id} className={key.removed || key.sameAs ? styles.gone : undefined}>
                <td>
                  Key {index + 1} <span className={styles.id}>{key.id.slice(0, 6)}</span>
                </td>
                <td className={styles.num}>{key.credits === null ? "–" : number.format(key.credits)}</td>
                <td className={styles.num}>{key.seconds === null ? "–" : duration(key.seconds)}</td>
                <td>
                  <span className={`${styles.chip} ${styles[`chip_${key.removed ? "removed" : key.status}`]}`}>
                    {key.removed ? "Removed" : STATUS_LABEL[key.status]}
                  </span>
                  {key.note && !key.removed && <span className={styles.note}>{key.note}</span>}
                  {key.sameAs && !key.removed && (
                    <span className={styles.note}>Same account as Key {key.sameAs}, counted once</span>
                  )}
                </td>
              </tr>
            ))}
            {billing.keys.length === 0 && (
              <tr>
                <td colSpan={4} className={styles.empty}>
                  No keys found. Add some to keys.csv or the keys secret.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className={styles.foot}>
        Keys at zero credits are removed from the key list when this page loads.{" "}
        <a href="?prune=0">Check without removing</a> · <a href="/api/billing">JSON</a>. Keys on the same Decart account
        share one balance, so it is counted once in the totals and the extra keys are marked.
      </p>
    </main>
  );
}
