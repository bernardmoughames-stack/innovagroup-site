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

  // Dark pad
  const padGain = ctx.createGain();
  padGain.gain.value = 0.24;
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = 'lowpass';
  padFilter.frequency.value = 220;
  padFilter.connect(padGain).connect(master);

  const oscA = ctx.createOscillator();
  oscA.type = 'sine';
  oscA.frequency.value = 55; // A1
  const oscB = ctx.createOscillator();
  oscB.type = 'sine';
  oscB.frequency.value = 110.6; // slightly detuned octave — slow beating
  const oscGainB = ctx.createGain();
  oscGainB.gain.value = 0.5;
  oscA.connect(padFilter);
  oscB.connect(oscGainB).connect(padFilter);

  // Slow LFO opens the filter like light moving over a surface
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.05;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 90;
  lfo.connect(lfoGain).connect(padFilter.frequency);

  // Air / shimmer: filtered noise, barely audible
  const seconds = 2;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 2400;
  noiseFilter.Q.value = 1.8;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.015;
  noise.connect(noiseFilter).connect(noiseGain).connect(master);

  oscA.start();
  oscB.start();
  lfo.start();
  noise.start();
  started = true;
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
