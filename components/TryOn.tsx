"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { STAGE_ASPECT, useTryOn } from "@/hooks/useTryOn";
import { CATEGORIES, GARMENTS, type GarmentCategory } from "@/lib/garments";
import GarmentCarousel from "@/components/GarmentCarousel";

const CONNECTION_LABEL = {
  connecting: "Connecting",
  connected: "Connected",
  generating: "Live",
  reconnecting: "Reconnecting",
  disconnected: "Disconnected",
} as const;

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.6a1 1 0 0 0 .8-.4l.9-1.2A1 1 0 0 1 9.6 4h4.8a1 1 0 0 1 .8.4l.9 1.2a1 1 0 0 0 .8.4h1.6A2.5 2.5 0 0 1 21 8.5v8A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-8Z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </svg>
  );
}

export default function TryOn() {
  const {
    phase,
    connection,
    switching,
    message,
    activeId,
    applyingId,
    cameraStream,
    timer,
    outputRef,
    start,
    stop,
    select,
    resetUsage,
  } = useTryOn();
  const [category, setCategory] = useState<GarmentCategory | "All">("All");

  const cameraRef = useCallback(
    (el: HTMLVideoElement | null) => {
      if (el) el.srcObject = cameraStream;
    },
    [cameraStream],
  );

  const running = phase !== "idle";
  const waiting =
    phase === "starting" || switching || connection === "connecting" || connection === "reconnecting";
  const applying = GARMENTS.find((g) => g.id === applyingId);
  const visible = category === "All" ? GARMENTS : GARMENTS.filter((g) => g.category === category);

  const statusLabel =
    phase === "starting" && !connection ? "Starting" : connection ? CONNECTION_LABEL[connection] : "Offline";
  const statusTone = connection === "generating" ? "live" : "busy";

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Image src="/logo.png" alt="" width={28} height={28} className="brand-logo" priority />
          Live Try-On
        </div>
      </header>

      <main className="layout">
        <section className="stage-col" aria-label="Live video">
          <div className="stage" style={{ aspectRatio: STAGE_ASPECT }}>
            <video ref={outputRef} className="output" autoPlay playsInline muted hidden={!running} />

            {!running && (
              <div className="splash">
                <span className="splash-icon">
                  <CameraIcon />
                </span>
                <h1 className="splash-title">See yourself in any garment, live</h1>
                <p className="splash-sub">
                  Choose a garment, start your camera, and switch outfits in real time.
                </p>
                <button className="btn btn-primary" onClick={start}>
                  Start try-on
                </button>
                {timer?.allExhausted && (
                  <button className="btn-link" onClick={resetUsage}>
                    Topped up your keys? Reset the timer
                  </button>
                )}
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
                <div className={`badge badge-${statusTone}`} role="status">
                  <span className="badge-dot" />
                  {statusLabel}
                </div>
                <button className="btn btn-stop" onClick={stop}>
                  <span className="stop-square" aria-hidden />
                  Stop
                </button>
                {waiting && (
                  <div className="overlay">
                    <span className="spinner" />
                    {switching
                      ? "Switching to your next API key…"
                      : connection === "reconnecting"
                        ? "Reconnecting…"
                        : "Starting your live session…"}
                  </div>
                )}
                {!waiting && applying && (
                  <div className="toast">
                    <span className="spinner spinner-sm" />
                    Dressing you in {applying.name}…
                  </div>
                )}
              </>
            )}
          </div>

          {message && (
            <p className="notice" role="alert">
              {message}
            </p>
          )}
        </section>

        <section className="picker" aria-label="Garments">
          <div className="filters">
            {(["All", ...CATEGORIES] as const).map((name) => (
              <button
                key={name}
                className={`filter${category === name ? " filter-active" : ""}`}
                onClick={() => setCategory(name)}
                aria-pressed={category === name}
              >
                {name}
              </button>
            ))}
          </div>

          <GarmentCarousel garments={visible} activeId={activeId} applyingId={applyingId} onSelect={select} />
        </section>
      </main>

      {timer && (
        <div className={`timer${timer.remaining <= 60 ? " timer-low" : ""}`}>
          {formatTime(timer.remaining)}
        </div>
      )}
    </div>
  );
}
