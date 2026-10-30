"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import styles from "./addKey.module.css";

type State =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "error"; message: string }
  | { kind: "done"; message: string };

const number = new Intl.NumberFormat("en-IN");

export default function AddKeyDialog({ passwordRequired }: { passwordRequired: boolean }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [key, setKey] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  function open() {
    setState({ kind: "idle" });
    dialog.current?.showModal();
  }

  function close() {
    dialog.current?.close();
    setKey("");
    setPassword("");
    setState({ kind: "idle" });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setState({ kind: "saving" });
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({ kind: "error", message: body.error ?? "Couldn't save the key." });
        return;
      }
      setKey("");
      setState({
        kind: "done",
        message: body.added
          ? `Saved key ${String(body.id).slice(0, 6)} with ${number.format(body.credits)} credits. You now have ${body.keysNow} keys.`
          : `That key was already in your list (${String(body.id).slice(0, 6)}).`,
      });
      router.refresh();
    } catch {
      setState({ kind: "error", message: "Couldn't reach the server. Try again." });
    }
  }

  const saving = state.kind === "saving";

  return (
    <>
      <button type="button" className={styles.open} onClick={open}>
        Add a key
      </button>

      <dialog ref={dialog} className={styles.dialog} onClose={() => setState({ kind: "idle" })}>
        <form className={styles.form} onSubmit={save}>
          <h2 className={styles.title}>Add an API key</h2>
          <p className={styles.text}>
            Paste a Decart API key. It is checked with Decart, then saved with your other keys.
          </p>

          <label className={styles.label} htmlFor="new-key">
            API key
          </label>
          <input
            id="new-key"
            className={styles.input}
            type="password"
            autoComplete="off"
            spellCheck={false}
            required
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />

          {passwordRequired ? (
            <>
              <label className={styles.label} htmlFor="new-key-password">
                Password
              </label>
              <input
                id="new-key-password"
                className={styles.input}
                type="password"
                autoComplete="off"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </>
          ) : (
            <p className={styles.warn}>
              Anyone with this page's link can add keys. Set BILLING_PASSWORD to lock this form.
            </p>
          )}

          {state.kind === "error" && (
            <p className={styles.error} role="alert">
              {state.message}
            </p>
          )}
          {state.kind === "done" && (
            <p className={styles.ok} role="status">
              {state.message}
            </p>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={close}>
              {state.kind === "done" ? "Close" : "Cancel"}
            </button>
            <button type="submit" className={styles.primary} disabled={saving || !key.trim()}>
              {saving ? "Checking and saving…" : "Save"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
