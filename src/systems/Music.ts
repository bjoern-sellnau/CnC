/**
 * Procedural background music à la Command & Conquer — a driving 16-step
 * sequencer with a bassline, a lead arpeggio and percussion, all synthesised
 * via the Web Audio API (no audio files). Several tracks of different mood.
 */

interface Track {
  name: string;
  tempo: number; // BPM
  /** Semitone offsets from the root for the bass on each of 16 steps (-1 = rest). */
  bass: number[];
  /** Semitone offsets for the lead arpeggio (-1 = rest). */
  lead: number[];
  /** Kick drum steps. */
  kick: number[];
  /** Hi-hat steps. */
  hat: number[];
  root: number; // MIDI note of the bass root
}

const TRACKS: Track[] = [
  {
    name: "Stahlmarsch",
    tempo: 126,
    root: 36, // C2
    bass: [0, -1, 0, -1, 7, -1, 0, -1, 0, -1, 3, -1, 5, -1, 7, -1],
    lead: [12, -1, 15, 19, -1, 15, 12, -1, 10, -1, 12, 15, -1, 12, 10, 7],
    kick: [0, 4, 8, 12],
    hat: [2, 6, 10, 14],
  },
  {
    name: "Schattenfront",
    tempo: 138,
    root: 33, // A1
    bass: [0, 0, -1, 0, 5, -1, 3, -1, 0, 0, -1, 7, 5, -1, 3, 2],
    lead: [12, 14, 15, -1, 19, -1, 22, 19, 15, -1, 14, 12, -1, 10, -1, 7],
    kick: [0, 3, 6, 8, 11, 14],
    hat: [1, 2, 5, 7, 9, 13, 15],
  },
  {
    name: "Funkstille",
    tempo: 112,
    root: 38, // D2
    bass: [0, -1, -1, 0, -1, -1, 7, -1, 5, -1, -1, 3, -1, -1, 0, -1],
    lead: [-1, 19, -1, 22, -1, 19, -1, 15, -1, 17, -1, 19, -1, 15, -1, 12],
    kick: [0, 8],
    hat: [4, 12],
  },
];

const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export class Music {
  private ctx: AudioContext;
  private out: GainNode;
  enabled = true;
  private playing = false;
  private trackIndex = 0;
  private step = 0;
  private nextNoteTime = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0.5;
    this.out.connect(destination);
  }

  get currentTrackName(): string {
    return TRACKS[this.trackIndex].name;
  }

  start(): void {
    if (this.playing || !this.enabled) return;
    this.playing = true;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.scheduler();
  }

  stop(): void {
    this.playing = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (this.enabled) this.start();
    else this.stop();
    return this.enabled;
  }

  nextTrack(): void {
    this.trackIndex = (this.trackIndex + 1) % TRACKS.length;
    this.step = 0;
  }

  private scheduler = (): void => {
    if (!this.playing) return;
    const track = TRACKS[this.trackIndex];
    const stepDur = 60 / track.tempo / 4; // sixteenth notes
    while (this.nextNoteTime < this.ctx.currentTime + 0.12) {
      this.scheduleStep(track, this.step, this.nextNoteTime);
      this.nextNoteTime += stepDur;
      this.step++;
      if (this.step >= 16) {
        this.step = 0;
        // Every couple of loops, drift to the next track for variety.
        if (Math.random() < 0.12) this.nextTrack();
      }
    }
    this.timer = setTimeout(this.scheduler, 25);
  };

  private scheduleStep(track: Track, step: number, time: number): void {
    const stepDur = 60 / track.tempo / 4;
    const b = track.bass[step];
    if (b >= 0) this.tone(midiToFreq(track.root + b), time, stepDur * 1.8, "sawtooth", 0.22, 600);
    const l = track.lead[step];
    if (l >= 0) this.tone(midiToFreq(track.root + 12 + l), time, stepDur * 1.1, "square", 0.09, 2200);
    if (track.kick.includes(step)) this.kick(time);
    if (track.hat.includes(step)) this.hat(time);
  }

  private tone(
    freq: number,
    time: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    cutoff: number
  ): void {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = cutoff;
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(gain, time + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(lp);
    lp.connect(g);
    g.connect(this.out);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private kick(time: number): void {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
    g.gain.setValueAtTime(0.5, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
    osc.connect(g);
    g.connect(this.out);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  private hat(time: number): void {
    const frames = Math.floor(this.ctx.sampleRate * 0.05);
    const buf = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 6000;
    const g = this.ctx.createGain();
    g.gain.value = 0.12;
    src.connect(hp);
    hp.connect(g);
    g.connect(this.out);
    src.start(time);
  }
}
