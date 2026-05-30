/**
 * Lightweight procedural sound effects via the Web Audio API — no asset files.
 * All methods are safe no-ops in non-browser environments (e.g. the headless
 * test) and before the user's first interaction unlocks the AudioContext.
 */
type SfxName = "shoot" | "rocket" | "explosion" | "build" | "ready" | "place" | "select";

export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = true;
  private lastPlayed: Record<string, number> = {};

  /** Must be called from a user gesture (click/keydown) to satisfy autoplay. */
  unlock(): void {
    if (this.ctx || typeof window === "undefined") return;
    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.25;
    this.master.connect(this.ctx.destination);
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  play(name: SfxName): void {
    if (!this.enabled || !this.ctx || !this.master) return;
    // Throttle identical rapid sounds (e.g. many shots in one frame).
    const now = this.ctx.currentTime;
    if (now - (this.lastPlayed[name] ?? -1) < 0.04) return;
    this.lastPlayed[name] = now;

    switch (name) {
      case "shoot":
        this.blip("square", 220, 140, 0.06, 0.12);
        break;
      case "rocket":
        this.blip("sawtooth", 320, 120, 0.18, 0.16);
        break;
      case "explosion":
        this.noiseBurst(0.3, 0.35);
        break;
      case "build":
        this.blip("triangle", 160, 240, 0.12, 0.18);
        break;
      case "ready":
        this.blip("sine", 520, 700, 0.16, 0.2);
        break;
      case "place":
        this.blip("triangle", 300, 120, 0.12, 0.2);
        break;
      case "select":
        this.blip("sine", 660, 760, 0.05, 0.1);
        break;
    }
  }

  private blip(
    type: OscillatorType,
    startFreq: number,
    endFreq: number,
    duration: number,
    gain: number
  ): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), t + duration);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g);
    g.connect(this.master!);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  private noiseBurst(duration: number, gain: number): void {
    const ctx = this.ctx!;
    const frames = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    src.connect(lp);
    lp.connect(g);
    g.connect(this.master!);
    src.start();
  }
}

/** Shared instance used across the game. */
export const sound = new Sound();
