"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createDecartClient,
  models,
  resolveFpsNumber,
  type ConnectionState,
  type RealTimeClient,
} from "@decartai/sdk";
import { GARMENTS, type Garment } from "@/lib/garments";
import { loadGarmentBlob } from "@/lib/image";

export type Phase = "idle" | "starting" | "live";

const model = models.realtime("lucy-vton-latest");

export const STAGE_ASPECT = `${model.width} / ${model.height}`;

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

function describeSessionEnd(reason: string): string {
  switch (reason) {
    case "insufficient_credits":
      return "Your Decart account is out of credits.";
    case "session_limit":
      return "Too many live sessions are running on this API key. Close one and try again.";
    case "moderation_violation":
    case "policy_violation":
      return "The session was ended by Decart's content policy.";
    default:
      return "The session ended.";
  }
}

export function useTryOn() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [connection, setConnection] = useState<ConnectionState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeId, setActiveId] = useState(GARMENTS[0].id);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const outputRef = useRef<HTMLVideoElement | null>(null);
  const rtRef = useRef<RealTimeClient | null>(null);
  const cameraRef = useRef<MediaStream | null>(null);
  const activeIdRef = useRef(activeId);
  const phaseRef = useRef<Phase>("idle");
  // Bumped on every start/stop so stale async work can tell it was cancelled.
  const sessionRef = useRef(0);
  // Bumped on every garment change so only the latest selection is applied.
  const applyRef = useRef(0);

  const updatePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const teardown = useCallback(() => {
    rtRef.current?.disconnect();
    rtRef.current = null;
    cameraRef.current?.getTracks().forEach((t) => t.stop());
    cameraRef.current = null;
    if (outputRef.current) outputRef.current.srcObject = null;
    setCameraStream(null);
    setConnection(null);
    setApplyingId(null);
  }, []);

  const applyGarment = useCallback(async (garment: Garment) => {
    const rt = rtRef.current;
    if (!rt) return;
    const ticket = ++applyRef.current;
    setApplyingId(garment.id);
    try {
      const image = await loadGarmentBlob(garment.image);
      if (ticket !== applyRef.current || rtRef.current !== rt) return;
      await rt.setImage(image, { prompt: garment.prompt, enhance: false });
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
    const session = ++sessionRef.current;
    const cancelled = () => session !== sessionRef.current;

    updatePhase("starting");
    setMessage(null);

    try {
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

      // A fresh token for every connect; the permanent key stays on the server.
      const res = await fetch("/api/token", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not get a session token.");
      if (cancelled()) return;

      const client = createDecartClient({ apiKey: body.apiKey });
      const rt = await client.realtime.connect(camera, {
        model,
        mirror: true,
        onRemoteStream: (stream) => {
          if (outputRef.current) outputRef.current.srcObject = stream;
        },
        onConnectionChange: (state) => {
          if (!cancelled()) setConnection(state);
        },
      });
      if (cancelled()) {
        rt.disconnect();
        return;
      }

      rt.on("error", (err) => setMessage(err.message));
      rt.on("sessionEnded", ({ reason }) => {
        if (cancelled()) return;
        sessionRef.current++;
        teardown();
        updatePhase("idle");
        setMessage(describeSessionEnd(reason));
      });

      rtRef.current = rt;
      updatePhase("live");
      const garment = GARMENTS.find((g) => g.id === activeIdRef.current) ?? GARMENTS[0];
      void applyGarment(garment);
    } catch (err) {
      if (cancelled()) return;
      teardown();
      updatePhase("idle");
      setMessage(describeError(err));
    }
  }, [applyGarment, teardown, updatePhase]);

  const stop = useCallback(() => {
    sessionRef.current++;
    applyRef.current++;
    teardown();
    updatePhase("idle");
  }, [teardown, updatePhase]);

  const select = useCallback(
    (garment: Garment) => {
      activeIdRef.current = garment.id;
      setActiveId(garment.id);
      if (rtRef.current) void applyGarment(garment);
    },
    [applyGarment],
  );

  // Release the camera and the realtime session if the page unmounts.
  useEffect(() => {
    return () => {
      sessionRef.current++;
      teardown();
    };
  }, [teardown]);

  return {
    phase,
    connection,
    message,
    activeId,
    applyingId,
    cameraStream,
    outputRef,
    start,
    stop,
    select,
  };
}
