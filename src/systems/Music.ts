/**
 * Procedural background music — brooding, industrial Command & Conquer mood,
 * synthesised entirely via the Web Audio API (no audio files).
 *
 * Each track is a chord progression in a minor key. Per 16th-step we layer a
 * driving bassline, a sustained pad/drone for atmosphere, sparse melodic stabs
 * and military percussion. Tracks only change on a bar boundary so transitions
 * stay smooth.
 */

interface Track {
  name: string;
  tempo: number; // BPM
  root: number; // MIDI root of the key
  /** Chord-root offset (semitones, minor-scale degrees) for each of 4 bars. */
  prog: number[];
  /** Density of melodic stabs (0..1). */
  lead: number;
  /** Whether percussion drives hard or stays sparse. */
  driving: boolean;
}

// Natural-minor scale degrees (semitones).
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

const TRACKS: Track[] = [
  { name: "Stahlmarsch", tempo: 104, root: 33, prog: [0, 0, 8, 5], lead: 0.5, driving: true }, // A minor: i i VI iv
  { name: "Schattenfront", tempo: 122, root: 38, prog: [0, 7, 5, 3], lead: 0.7, driving: true }, // D minor: i v iv III
  { name: "Funkstille", tempo: 86, root: 28, prog: [0, 0, 3, 0], lead: 0.3, driving: false }, // E minor (low): i i III i
];

export class Music {
  private ctx: AudioContext;
  private out: GainNode;
  private bus: BiquadFilterNode;
  enabled = true;
  private playing = false;
  private trackIndex = 0;
  private step = 0;
  private bar = 0;
  private nextNoteTime = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0.4;
    // A gentle global low-pass warms the whole mix so it sits under the SFX.
    this.bus = ctx.createBiquadFilter();
    this.bus.type = "lowpass";
    this.bus.frequency.value = 3200;
    this.out.connect(this.bus);
    this.bus.connect(destination);
  }

  get currentTrackName(): string {
    return TRACKS[this.trackIndex].name;
  }

  start(): void {
    if (this.playing || !this.enabled) return;
    this.playing = true;
    this.step = 0;
    this.bar = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.08;
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
    this.bar = 0;
  }

  private scheduler = (): void => {
    if (!this.playing) return;
    const track = TRACKS[this.trackIndex];
    const stepDur = 60 / track.tempo / 4;
    while (this.nextNoteTime < this.ctx.currentTime + 0.14) {
      this.scheduleStep(track, this.step, this.bar, this.nextNoteTime, stepDur);
      this.nextNoteTime += stepDur;
      this.step++;
      if (this.step >= 16) {
        this.step = 0;
        this.bar++;
        // After 8 bars, advance to the next track cleanly at the boundary.
        if (this.bar >= 8) {
          this.bar = 0;
          this.trackIndex = (this.trackIndex + 1) % TRACKS.length;
        }
      }
    }
    this.timer = setTimeout(this.scheduler, 25);
  };

  private scheduleStep(track: Track, step: number, bar: number, time: number, stepDur: number): void {
    const chordRoot = track.root + track.prog[bar % track.prog.length];

    // Pad / drone — sustained chord struck at the start of each bar.
    if (step === 0) {
      const barLen = stepDur * 16;
      this.pad(midiToFreq(chordRoot + 12), time, barLen * 1.02);
      this.pad(midiToFreq(chordRoot + 12 + 3), time, barLen * 1.02); // minor third
      this.pad(midiToFreq(chordRoot + 12 + 7), time, barLen * 1.02); // fifth
    }

    // Bassline — root, syncopated and driving.
    const bassSteps = track.driving ? [0, 3, 6, 8, 11, 14] : [0, 8];
    if (bassSteps.includes(step)) {
      this.bass(midiToFreq(chordRoot), time, stepDur * (track.driving ? 1.4 : 3));
    }

    // Melodic stabs from the minor scale — sparse, deterministic-ish.
    if ((step === 2 || step === 7 || step === 10 || step === 12) && Math.random() < track.lead) {
      const deg = MINOR[(step + bar) % MINOR.length];
      this.stab(midiToFreq(chordRoot + 24 + deg), time, stepDur * 1.6);
    }

    // Percussion.
    if (step === 0 || step === 8) this.kick(time);
    if (step === 4 || step === 12) this.snare(time);
    if (track.driving && step % 2 === 1) this.hat(time, 0.07);
    else if (!track.driving && (step === 6 || step === 14)) this.hat(time, 0.05);
  }

  // ---- instruments --------------------------------------------------------

  private bass(freq: number, time: number, dur: number): void {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(520, time);
    lp.frequency.exponentialRampToValueAtTime(180, time + dur);
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(0.26, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(lp);
    lp.connect(g);
    g.connect(this.out);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private pad(freq: number, time: number, dur: number): void {
    // Two slightly detuned triangles = warm, wide drone.
    for (const det of [-5, 5]) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      osc.detune.value = det;
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(0.045, time + dur * 0.25);
      g.gain.linearRampToValueAtTime(0.035, time + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      osc.connect(g);
      g.connect(this.out);
      osc.start(time);
      osc.stop(time + dur + 0.05);
    }
  }

  private stab(freq: number, time: number, dur: number): void {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2000;
    osc.type = "square";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(0.06, time + 0.01);
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
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(46, time + 0.12);
    g.gain.setValueAtTime(0.55, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
    osc.connect(g);
    g.connect(this.out);
    osc.start(time);
    osc.stop(time + 0.22);
  }

  private snare(time: number): void {
    const frames = Math.floor(this.ctx.sampleRate * 0.18);
    const buf = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1900;
    bp.Q.value = 0.7;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.16, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.out);
    src.start(time);
  }

  private hat(time: number, gain: number): void {
    const frames = Math.floor(this.ctx.sampleRate * 0.04);
    const buf = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(hp);
    hp.connect(g);
    g.connect(this.out);
    src.start(time);
  }
}
