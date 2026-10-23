import { createDecartClient, models, type ConnectionState, type RealTimeClient } from "@decartai/sdk";
import type { Garment } from "@/lib/garments";
import { loadGarmentBlob } from "@/lib/image";
import { budgetOf, saveUsage, usageOf, type UsageStore } from "@/lib/keyUsage";

export const model = models.realtime("lucy-2.5");

export interface KeyPool {
  keyIds: string[];
  secondsPerKey: number;
}

export interface RotatingSessionEvents {
  /** Connection state of the session currently on screen. */
  onConnection: (state: ConnectionState | null) => void;
  /** True while the picture is frozen waiting for the next key to come up. */
  onSwitching: (switching: boolean) => void;
  /** The first session is up. */
  onLive: () => void;
  /** Non-fatal problem worth showing. */
  onError: (message: string) => void;
  /** Nothing left to continue with; the owner should stop the session. */
  onEnd: (message: string) => void;
  /** Usage counters moved; refresh the countdown. */
  onUsage: () => void;
}

interface Options {
  camera: MediaStream;
  pool: KeyPool;
  usage: UsageStore;
  /** The garment the user currently has selected. */
  garment: () => Garment;
  output: () => HTMLVideoElement | null;
  events: RotatingSessionEvents;
}

/** One realtime session, bound to one API key. */
interface Slot {
  keyId: string;
  rt: RealTimeClient | null;
  stream: MediaStream | null;
  state: ConnectionState | null;
  garmentId: string;
  launchedAt: number;
  generatingAt: number | null;
}

const TICK_MS = 250;
/** Guess for how long a connect takes until one has been measured. */
const DEFAULT_CONNECT_SECONDS = 5;
/** Bring the standby up this much earlier than the measured connect time strictly needs. */
const PREWARM_MARGIN_SECONDS = 2;
/** Standby live this long while the current key keeps going means the budget guess was too low. */
const STANDBY_GRACE_SECONDS = 8;

/** Session-end reasons that only rule out this key, so the next one takes over. */
const SWITCH_REASONS = new Set(["insufficient_credits", "session_limit"]);

function describeSessionEnd(reason: string): string {
  switch (reason) {
    case "moderation_violation":
    case "policy_violation":
      return "The session was ended by Decart's content policy.";
    default:
      return "The session ended.";
  }
}

async function fetchToken(keyId: string): Promise<{ apiKey: string }> {
  const res = await fetch("/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyId }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Could not get a session token.");
  return body;
}

/**
 * A live try-on that rotates through a pool of API keys. Shortly before the
 * current key is expected to run out, a standby session is opened on the next
 * key, already wearing the selected garment; when Decart ends the current
 * session for insufficient credits the standby's stream is swapped onto the
 * screen, so the picture doesn't drop.
 */
export class RotatingSession {
  private active: Slot | null = null;
  private standby: Slot | null = null;
  /** Keys that failed to connect during this session; skipped until the next start. */
  private failed = new Set<string>();
  private stopped = false;
  private live = false;
  private connectSeconds = DEFAULT_CONNECT_SECONDS;
  private lastError: string | null = null;
  private lastTick = performance.now();
  private ticks = 0;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(private readonly o: Options) {}

  get activeKeyId(): string | null {
    return this.active?.keyId ?? null;
  }

  start() {
    this.lastTick = performance.now();
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.connectNext();
  }

  stop() {
    if (this.stopped) return;
    this.account();
    this.stopped = true;
    clearInterval(this.timer);
    this.active?.rt?.disconnect();
    this.standby?.rt?.disconnect();
    this.active = this.standby = null;
    saveUsage(this.o.usage);
  }

  /** Dresses every connected session; throws only if the on-screen one fails. */
  async setGarment(garment: Garment, image: Blob) {
    const standby = this.standby;
    if (standby?.rt) this.dress(standby, garment, image).catch(() => {});
    const active = this.active;
    if (active?.rt) await this.dress(active, garment, image);
  }

  private async dress(slot: Slot, garment: Garment, image: Blob) {
    slot.garmentId = garment.id;
    await slot.rt!.setImage(image, { prompt: garment.prompt, enhance: false });
  }

  private isCurrent(slot: Slot) {
    return !this.stopped && (slot === this.active || slot === this.standby);
  }

  private pickKey(after?: string): string | null {
    const { keyIds } = this.o.pool;
    const busy = new Set([this.active?.keyId, this.standby?.keyId]);
    const from = after ? keyIds.indexOf(after) + 1 : 0;
    for (let i = 0; i < keyIds.length; i++) {
      const id = keyIds[(from + i) % keyIds.length];
      if (!busy.has(id) && !this.failed.has(id) && !this.o.usage.keys[id]?.exhausted) return id;
    }
    return null;
  }

  /** Puts a fresh session on screen, or ends everything if no key is left. */
  private connectNext(after?: string) {
    const keyId = this.pickKey(after);
    if (!keyId) {
      const allOut = this.o.pool.keyIds.every((id) => this.o.usage.keys[id]?.exhausted);
      this.o.events.onEnd(
        allOut
          ? "All your API keys are out of credits. Add fresh keys to keys.csv."
          : `Couldn't connect with any of your API keys. ${this.lastError ?? ""}`.trim(),
      );
      return;
    }
    this.active = this.launch(keyId);
    this.o.events.onConnection("connecting");
  }

  /** The on-screen session is gone: promote the standby, or connect the next key. */
  private replaceActive(previousKeyId: string) {
    const standby = this.standby;
    if (standby) {
      this.standby = null;
      this.active = standby;
      this.attach(standby);
      this.o.events.onConnection(standby.state);
      this.o.events.onSwitching(standby.state !== "generating");
      return;
    }
    if (this.live) this.o.events.onSwitching(true);
    this.connectNext(previousKeyId);
  }

  private launch(keyId: string): Slot {
    const garment = this.o.garment();
    const slot: Slot = {
      keyId,
      rt: null,
      stream: null,
      state: "connecting",
      garmentId: garment.id,
      launchedAt: performance.now(),
      generatingAt: null,
    };
    this.open(slot, garment).catch((err) => this.onLaunchFailed(slot, err));
    return slot;
  }

  private async open(slot: Slot, garment: Garment) {
    const [token, image] = await Promise.all([fetchToken(slot.keyId), loadGarmentBlob(garment.image)]);
    if (!this.isCurrent(slot)) return;

    const client = createDecartClient({ apiKey: token.apiKey });
    const rt = await client.realtime.connect(this.o.camera, {
      model,
      // Fast mode: lower latency and higher throughput, billed at 4 credits/sec.
      speed: "fast",
      mirror: true,
      // Start already dressed so a swapped-in session looks right on its first frame.
      initialState: { image, prompt: { text: garment.prompt, enhance: false } },
      onRemoteStream: (stream) => {
        slot.stream = stream;
        if (slot === this.active) this.attach(slot);
      },
      onConnectionChange: (state) => this.onSlotState(slot, state),
    });
    if (!this.isCurrent(slot)) {
      rt.disconnect();
      return;
    }

    slot.rt = rt;
    rt.on("error", (err) => {
      if (slot === this.active) this.o.events.onError(err.message);
    });
    rt.on("sessionEnded", ({ reason }) => this.onSlotEnded(slot, reason));

    if (slot === this.active && !this.live) {
      this.live = true;
      this.o.events.onLive();
    }
    // The user may have picked another garment while this session was connecting.
    const current = this.o.garment();
    if (slot.garmentId !== current.id) {
      loadGarmentBlob(current.image)
        .then((img) => this.dress(slot, current, img))
        .catch(() => {});
    }
  }

  private attach(slot: Slot) {
    const video = this.o.output();
    if (video && slot.stream) video.srcObject = slot.stream;
  }

  private onSlotState(slot: Slot, state: ConnectionState) {
    slot.state = state;
    if (state === "generating" && slot.generatingAt === null) {
      slot.generatingAt = performance.now();
      const seconds = (slot.generatingAt - slot.launchedAt) / 1000;
      this.connectSeconds = Math.min(20, Math.max(1, seconds));
    }
    if (slot === this.active && !this.stopped) {
      this.o.events.onConnection(state);
      if (state === "generating") this.o.events.onSwitching(false);
    }
  }

  private onLaunchFailed(slot: Slot, err: unknown) {
    if (!this.isCurrent(slot)) return;
    const message = err instanceof Error ? err.message : String(err);
    this.lastError = message;
    if (/credit/i.test(message)) this.markExhausted(slot.keyId);
    else this.failed.add(slot.keyId);

    if (slot === this.standby) {
      this.standby = null;
      return;
    }
    this.active = null;
    this.replaceActive(slot.keyId);
  }

  private onSlotEnded(slot: Slot, reason: string) {
    if (!this.isCurrent(slot)) return;
    slot.rt?.disconnect();

    if (reason === "insufficient_credits") {
      // Calibrate the countdown from how long this key really lasted.
      const used = usageOf(this.o.usage, slot.keyId).used;
      if (slot === this.active && used >= 5) this.o.usage.observedBudget = Math.round(used);
      this.markExhausted(slot.keyId);
    } else {
      this.failed.add(slot.keyId);
    }

    if (slot === this.standby) {
      this.standby = null;
      return;
    }
    if (!SWITCH_REASONS.has(reason)) {
      this.o.events.onEnd(describeSessionEnd(reason));
      return;
    }
    this.active = null;
    this.replaceActive(slot.keyId);
  }

  private markExhausted(keyId: string) {
    usageOf(this.o.usage, keyId).exhausted = true;
    saveUsage(this.o.usage);
    this.o.events.onUsage();
  }

  /** Adds the time since the last tick to every key that is generating (and so being billed). */
  private account() {
    const now = performance.now();
    const seconds = (now - this.lastTick) / 1000;
    this.lastTick = now;
    for (const slot of [this.active, this.standby]) {
      if (slot?.state === "generating") usageOf(this.o.usage, slot.keyId).used += seconds;
    }
  }

  private tick() {
    this.account();
    if (++this.ticks % 4 === 0) saveUsage(this.o.usage);
    this.o.events.onUsage();
    this.maybePrewarm();
  }

  private maybePrewarm() {
    const active = this.active;
    if (!active?.rt || active.state !== "generating") return;
    const store = this.o.usage;
    const budget = budgetOf(store, this.o.pool.secondsPerKey);
    const used = usageOf(store, active.keyId).used;
    const standby = this.standby;

    if (!standby) {
      if (used < budget - this.connectSeconds - PREWARM_MARGIN_SECONDS) return;
      const keyId = this.pickKey(active.keyId);
      if (keyId) this.standby = this.launch(keyId);
      return;
    }

    // The current key is outlasting the estimate while the standby bills in
    // parallel: drop the standby and push the estimate well out. The real
    // figure is learned when this key does run dry.
    if (
      standby.generatingAt !== null &&
      (performance.now() - standby.generatingAt) / 1000 > STANDBY_GRACE_SECONDS
    ) {
      this.standby = null;
      standby.rt?.disconnect();
      store.observedBudget = Math.round(Math.max(used + 30, budget * 1.5));
    }
  }
}
