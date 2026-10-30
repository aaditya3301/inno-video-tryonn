import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { safeNext, siteLocked } from "@/lib/siteAuth";
import LoginForm from "./LoginForm";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Log in · Live Try-On",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { next } = await searchParams;
  const target = safeNext(typeof next === "string" ? next : null);
  // Nothing to log in to when the site has no password (local development).
  if (!siteLocked()) redirect(target);

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <Image src="/logo.png" alt="" width={40} height={40} className={styles.logo} priority />
        <h1 className={styles.title}>Live Try-On</h1>
        <p className={styles.text}>Enter the password to continue.</p>
        <LoginForm next={target} />
      </div>
    </main>
  );
}
