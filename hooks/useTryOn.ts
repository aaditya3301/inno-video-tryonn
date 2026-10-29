"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveFpsNumber, type ConnectionState } from "@decartai/sdk";
import { GARMENTS, type Garment } from "@/lib/garments";
import { loadGarmentBlob } from "@/lib/image";
import { loadUsage, remainingSeconds, saveUsage, type UsageStore } from "@/lib/keyUsage";
import { pruneEmptyKeys } from "@/lib/pruneKeys";
import { model, RotatingSession, type KeyPool } from "@/lib/rotatingSession";

export type Phase = "idle" | "starting" | "live";

export const STAGE_ASPECT = `${model.width} / ${model.height}`;

export interface TimerInfo {
  /** Estimated seconds of try-on left across all keys. */
  remaining: number;
  /** 1-based position of the key on screen, or null when not live. */
  keyNumber: number | null;
  keyCount: number;
  allExhausted: boolean;
}

function describeError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") {
      return "Camera access was blocked. Allow the camera for this site in your browser and try again.";
    }
    if (err.name === "NotFoundError") return "No camera was found on this device.";
    if (err.name === "NotReadableError") return "Your camera is being used by another app.";
  }
  return err instanceof Error ? err.message : "Something went wrong.";
}

export function useTryOn() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [connection, setConnection] = useState<ConnectionState | null>(null);
  const [switching, setSwitching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activeId, setActiveId] = useState(GARMENTS[0].id);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [timer, setTimer] = useState<TimerInfo | null>(null);

  const outputRef = useRef<HTMLVideoElement | null>(null);
  const sessionRef = useRef<RotatingSession | null>(null);
  const cameraRef = useRef<MediaStream | null>(null);
  const poolRef = useRef<KeyPool | null>(null);
  const usageRef = useRef<UsageStore | null>(null);
  const activeIdRef = useRef(activeId);
  const phaseRef = useRef<Phase>("idle");
  // Bumped on every start/stop so stale async work can tell it was cancelled.
  const runRef = useRef(0);
  // Bumped on every garment change so only the latest selection is applied.
  const applyRef = useRef(0);

  const updatePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const usage = useCallback(() => (usageRef.current ??= loadUsage()), []);

  const refreshTimer = useCallback(() => {
    const pool = poolRef.current;
    if (!pool) return;
    const store = usage();
    const index = pool.keyIds.indexOf(sessionRef.current?.activeKeyId ?? "");
    const next: TimerInfo = {
      remaining: Math.ceil(remainingSeconds(store, pool.keyIds, pool.secondsPerKey)),
      keyNumber: index >= 0 ? index + 1 : null,
      keyCount: pool.keyIds.length,
      allExhausted: pool.keyIds.length > 0 && pool.keyIds.every((id) => store.keys[id]?.exhausted),
    };
    setTimer((prev) =>
      prev &&
      prev.remaining === next.remaining &&
      prev.keyNumber === next.keyNumber &&
      prev.keyCount === next.keyCount &&
      prev.allExhausted === next.allExhausted
        ? prev
        : next,
    );
  }, [usage]);

  // Re-read on every start so keys added to keys.csv are picked up.
  const loadPool = useCallback(async (): Promise<KeyPool> => {
    const res = await fetch("/api/token", { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? "Could not load your API keys.");
    poolRef.current = { keyIds: body.keyIds, secondsPerKey: body.secondsPerKey };
    refreshTimer();
    return poolRef.current;
  }, [refreshTimer]);

  const teardown = useCallback(() => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    cameraRef.current?.getTracks().forEach((t) => t.stop());
    cameraRef.current = null;
    if (outputRef.current) outputRef.current.srcObject = null;
    setCameraStream(null);
    setConnection(null);
    setSwitching(false);
    setApplyingId(null);
  }, []);

  const end = useCallback(
    (reason: string | null) => {
      runRef.current++;
      applyRef.current++;
      teardown();
      updatePhase("idle");
      setMessage(reason);
      refreshTimer();
    },
    [refreshTimer, teardown, updatePhase],
  );

  const applyGarment = useCallback(async (garment: Garment) => {
    const session = sessionRef.current;
    if (!session) return;
    const ticket = ++applyRef.current;
    setApplyingId(garment.id);
    try {
      const image = await loadGarmentBlob(garment.image);
      if (ticket !== applyRef.current || sessionRef.current !== session) return;
      await session.setGarment(garment, image);
      if (ticket === applyRef.current) setMessage(null);
    } catch (err) {
      if (ticket === applyRef.current) {
        setMessage(`Couldn't apply ${garment.name}: ${describeError(err)}`);
      }
    } finally {
      if (ticket === applyRef.current) setApplyingId(null);
    }
  }, []);

  const start = useCallback(async () => {
    if (phaseRef.current !== "idle") return;
    const run = ++runRef.current;
    const cancelled = () => run !== runRef.current;

    updatePhase("starting");
    setMessage(null);
    // Clear out keys that have hit zero since last time, in the background.
    pruneEmptyKeys();

    try {
      const pool = await loadPool();
      if (pool.keyIds.length === 0) {
        throw new Error("No API keys found. Add them to keys.csv (one per line) and try again.");
      }
      if (pool.keyIds.every((id) => usage().keys[id]?.exhausted)) {
        throw new Error("All your API keys are out of credits. Add fresh keys to keys.csv.");
      }
      if (cancelled()) return;

      const camera = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: model.width },
          height: { ideal: model.height },
          frameRate: { ideal: resolveFpsNumber(model.fps) },
        },
      });
      if (cancelled()) {
        camera.getTracks().forEach((t) => t.stop());
        return;
      }
      cameraRef.current = camera;
      setCameraStream(camera);

      const session = new RotatingSession({
        camera,
        pool,
        usage: usage(),
        garment: () => GARMENTS.find((g) => g.id === activeIdRef.current) ?? GARMENTS[0],
        output: () => outputRef.current,
        events: {
          onConnection: setConnection,
          onSwitching: (switching) => {
            setSwitching(switching);
            // Whatever the old key complained about is no longer relevant to the viewer.
            if (switching) setMessage(null);
          },
          onLive: () => updatePhase("live"),
          onError: setMessage,
          onEnd: end,
          onUsage: refreshTimer,
        },
      });
      sessionRef.current = session;
      session.start();
    } catch (err) {
      if (cancelled()) return;
      end(describeError(err));
    }
  }, [end, loadPool, refreshTimer, updatePhase, usage]);

  const stop = useCallback(() => end(null), [end]);

  const select = useCallback(
    (garment: Garment) => {
      activeIdRef.current = garment.id;
      setActiveId(garment.id);
      if (sessionRef.current) void applyGarment(garment);
    },
    [applyGarment],
  );

  /** Forget recorded usage, e.g. after topping up the keys that ran out. */
  const resetUsage = useCallback(() => {
    usageRef.current = { keys: {} };
    saveUsage(usageRef.current);
    setMessage(null);
    refreshTimer();
  }, [refreshTimer]);

  // Show the countdown before the first start.
  useEffect(() => {
    loadPool().catch(() => {});
    pruneEmptyKeys();
  }, [loadPool]);

  // Release the camera and the realtime sessions if the page unmounts.
  useEffect(() => {
    return () => {
      runRef.current++;
      teardown();
    };
  }, [teardown]);

  return {
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
  };
}
