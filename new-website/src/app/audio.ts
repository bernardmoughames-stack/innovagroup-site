/**
 * Ambient sound design, synthesised in WebAudio — no audio files to download.
 * A quiet, dark pad (two detuned low sines + filtered shimmer noise) plus a
 * short gold "tick" for portal interactions. Starts only after the visitor
 * explicitly chooses "Enter with sound"; the header toggle mutes at any time.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = true;
let started = false;

const MASTER_LEVEL = 0.16;

function build(): void {
  if (started || ctx) return;
  const AC: typeof AudioContext | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  // Warm, welcoming pad: an airy A-major glow (A3 + E4 fifth + a whisper of
  // A4) instead of a low drone — light, hotel-lobby-at-dusk rather than vault.
  const padGain = ctx.createGain();
  padGain.gain.value = 0.16;
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.value = 1300;
  padFilter.connect(padGain).connect(master);

  const oscA = ctx.createOscillator();
  oscA.type = 'sine';
  oscA.frequency.value = 220; // A3
  const oscB = ctx.createOscillator();
  oscB.type = 'sine';
  oscB.frequency.value = 329.9; // E4, a hair sharp for gentle movement
  const oscGainB = ctx.createGain();
  oscGainB.gain.value = 0.55;
  const oscC = ctx.createOscillator();
  oscC.type = 'triangle';
  oscC.frequency.value = 440; // A4 whisper
  const oscGainC = ctx.createGain();
  oscGainC.gain.value = 0.12;
  oscA.connect(padFilter);
  oscB.connect(oscGainB).connect(padFilter);
  oscC.connect(oscGainC).connect(padFilter);

  // Slow breathing of the filter, like light drifting over gold
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.06;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 420;
  lfo.connect(lfoGain).connect(padFilter.frequency);

  // Air / sparkle: brighter, quieter shimmer
  const seconds = 2;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 3400;
  noiseFilter.Q.value = 2.2;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.008;
  noise.connect(noiseFilter).connect(noiseGain).connect(master);

  oscA.start();
  oscB.start();
  oscC.start();
  lfo.start();
  noise.start();
  started = true;
}

/** Two soft bell notes — the welcome. */
function welcomeChime(): void {
  if (!ctx || !master) return;
  const notes: Array<[number, number]> = [
    [659.26, 0], // E5
    [880.0, 0.4], // A5
  ];
  for (const [freq, at] of notes) {
    const t0 = ctx.currentTime + 0.15 + at;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const harm = ctx.createOscillator();
    harm.type = 'sine';
    harm.frequency.value = freq * 2;
    const hGain = ctx.createGain();
    hGain.gain.value = 0.18;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.07, t0 + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.2);
    osc.connect(g);
    harm.connect(hGain).connect(g);
    g.connect(master);
    osc.start(t0);
    harm.start(t0);
    osc.stop(t0 + 2.4);
    harm.stop(t0 + 2.4);
  }
}

function ramp(to: number, secs = 1.2): void {
  if (!ctx || !master) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(to, ctx.currentTime, secs / 3);
}

/** Called from the loader's Enter buttons (a user gesture). */
export function startAudio(withSound: boolean): void {
  muted = !withSound;
  if (withSound) {
    build();
    void ctx?.resume();
    ramp(MASTER_LEVEL, 2.5);
    welcomeChime();
  }
  syncToggle();
}

export function setMuted(next: boolean): void {
  muted = next;
  if (!muted) {
    build();
    void ctx?.resume();
    ramp(MASTER_LEVEL);
  } else {
    ramp(0, 0.5);
  }
  syncToggle();
}

export const isMuted = (): boolean => muted;

/** Short gold tick for portal hover / clicks. Silent while muted. */
export function uiTick(freq = 1180): void {
  if (muted || !ctx || !master) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t0 + 0.12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.05, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + 0.16);
}

function syncToggle(): void {
  const btn = document.getElementById('sound-toggle');
  btn?.setAttribute('aria-pressed', String(!muted));
}
