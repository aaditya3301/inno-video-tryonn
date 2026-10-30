"use client";

import { useState, type FormEvent } from "react";
import styles from "./login.module.css";

export default function LoginForm({ next }: { next: string }) {
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Couldn't log in.");
        setChecking(false);
        return;
      }
      // A full page load, so the new login cookie is used for everything from the first request.
      window.location.assign(next);
    } catch {
      setError("Couldn't reach the server. Try again.");
      setChecking(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.label} htmlFor="site-password">
        Password
      </label>
      <input
        id="site-password"
        className={styles.input}
        type="password"
        name="password"
        autoComplete="current-password"
        autoFocus
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button className={styles.button} type="submit" disabled={checking || !password}>
        {checking ? "Checking…" : "Unlock"}
      </button>
    </form>
  );
}
