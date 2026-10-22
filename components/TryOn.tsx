"use client";

import Image from "next/image";
import { useCallback } from "react";
import { STAGE_ASPECT, useTryOn } from "@/hooks/useTryOn";
import { GARMENTS } from "@/lib/garments";

const CONNECTION_LABEL = {
  connecting: "Connecting",
  connected: "Connected",
  generating: "Live",
  reconnecting: "Reconnecting",
  disconnected: "Disconnected",
} as const;

export default function TryOn() {
  const { phase, connection, message, activeId, applyingId, cameraStream, outputRef, start, stop, select } =
    useTryOn();

  const cameraRef = useCallback(
    (el: HTMLVideoElement | null) => {
      if (el) el.srcObject = cameraStream;
    },
    [cameraStream],
  );

  const running = phase !== "idle";
  const waiting = phase === "starting" || connection === "connecting" || connection === "reconnecting";
  const applying = GARMENTS.find((g) => g.id === applyingId);
  const statusLabel =
    phase === "starting" && !connection ? "Starting" : connection ? CONNECTION_LABEL[connection] : "Offline";
  const statusTone = connection === "generating" ? "live" : running ? "busy" : "off";

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          Live Try-On
        </div>
        <div className={`status status-${statusTone}`} role="status">
          <span className="status-dot" />
          {statusLabel}
        </div>
      </header>

      <main className="layout">
        <section className="stage-col" aria-label="Live video">
          <div className="stage" style={{ aspectRatio: STAGE_ASPECT }}>
            <video ref={outputRef} className="output" autoPlay playsInline muted hidden={!running} />

            {!running && (
              <div className="splash">
                <p className="splash-title">See yourself in any garment, live.</p>
                <p className="splash-sub">
                  Pick a garment on the right, start your camera, and switch outfits in real time.
                </p>
                <button className="btn btn-primary" onClick={start}>
                  Start try-on
                </button>
              </div>
            )}

            {running && (
              <>
                <video
                  ref={cameraRef}
                  className="pip"
                  autoPlay
                  playsInline
                  muted
                  aria-label="Your camera"
                />
                {waiting && (
                  <div className="overlay">
                    <span className="spinner" />
                    {connection === "reconnecting" ? "Reconnecting…" : "Starting your live session…"}
                  </div>
                )}
                {!waiting && applying && (
                  <div className="chip">
                    <span className="spinner spinner-sm" />
                    Dressing you in {applying.name}…
                  </div>
                )}
                <button className="btn btn-stop" onClick={stop}>
                  Stop
                </button>
              </>
            )}
          </div>

          {message && (
            <p className="notice" role="alert">
              {message}
            </p>
          )}
        </section>

        <aside className="rack" aria-label="Garments">
          <h2 className="rack-title">Garments</h2>
          <div className="grid">
            {GARMENTS.map((garment) => {
              const active = garment.id === activeId;
              const busy = garment.id === applyingId;
              return (
                <button
                  key={garment.id}
                  className={`card${active ? " card-active" : ""}`}
                  onClick={() => select(garment)}
                  aria-pressed={active}
                >
                  <span className="card-img">
                    <Image
                      src={garment.image}
                      alt={garment.name}
                      fill
                      sizes="(max-width: 900px) 45vw, 180px"
                      style={{ objectFit: "contain" }}
                    />
                    {busy && (
                      <span className="card-busy">
                        <span className="spinner spinner-sm" />
                      </span>
                    )}
                  </span>
                  <span className="card-name">{garment.name}</span>
                  <span className="card-type">{garment.type}</span>
                </button>
              );
            })}
          </div>
        </aside>
      </main>
    </div>
  );
}
