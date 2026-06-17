// Procedurally synthesized built-in sample library.
// Generating audio in code means we ship a usable sample pack with real sound
// and zero binary assets. Each generator returns a ready-to-play AudioBuffer.

export interface SampleDef {
  id: string;
  name: string;
  category: "Drums" | "Bass" | "Synths" | "Vocals" | "FX";
  type: "drum" | "synth" | "audio";
  bpm: number | null;
  key: string;
  /** Musical length in beats (for loops); one-shots use ~1 beat visually. */
  loopBeats: number;
  generate: (ctx: BaseAudioContext) => AudioBuffer;
}

const SR_SECONDS = (ctx: BaseAudioContext, seconds: number) =>
  ctx.createBuffer(1, Math.max(1, Math.ceil(ctx.sampleRate * seconds)), ctx.sampleRate);

const noteToFreq = (semitonesFromA4: number) => 440 * Math.pow(2, semitonesFromA4 / 12);

function envelope(t: number, attack: number, decay: number) {
  if (t < attack) return t / attack;
  return Math.exp(-(t - attack) / decay);
}

// --- One-shot generators -------------------------------------------------

function makeKick(ctx: BaseAudioContext): AudioBuffer {
  const buf = SR_SECONDS(ctx, 0.5);
  const data = buf.getChannelData(0);
  const sr = ctx.sampleRate;
  for (let i = 0; i < data.length; i++) {
    const t = i / sr;
    const freq = 150 * Math.exp(-t * 35) + 45;
    const amp = Math.exp(-t * 9);
    data[i] = Math.sin(2 * Math.PI * freq * t) * amp;
  }
  return buf;
}

function makeSnare(ctx: BaseAudioContext): AudioBuffer {
  const buf = SR_SECONDS(ctx, 0.3);
  const data = buf.getChannelData(0);
  const sr = ctx.sampleRate;
  for (let i = 0; i < data.length; i++) {
    const t = i / sr;
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 22);
    const tone = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 30) * 0.7;
    data[i] = noise * 0.8 + tone;
  }
  return buf;
}

function makeHat(ctx: BaseAudioContext): AudioBuffer {
  const buf = SR_SECONDS(ctx, 0.12);
  const data = buf.getChannelData(0);
  const sr = ctx.sampleRate;
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const t = i / sr;
    const white = Math.random() * 2 - 1;
    // crude high-pass to make it metallic
    const hp = white - last;
    last = white;
    data[i] = hp * Math.exp(-t * 55);
  }
  return buf;
}

function makeClap(ctx: BaseAudioContext): AudioBuffer {
  const buf = SR_SECONDS(ctx, 0.3);
  const data = buf.getChannelData(0);
  const sr = ctx.sampleRate;
  const bursts = [0, 0.012, 0.024, 0.04];
  for (let i = 0; i < data.length; i++) {
    const t = i / sr;
    let amp = 0;
    for (const b of bursts) {
      if (t >= b) amp += Math.exp(-(t - b) * 45);
    }
    data[i] = (Math.random() * 2 - 1) * Math.min(1, amp) * 0.6;
  }
  return buf;
}

function make808(ctx: BaseAudioContext): AudioBuffer {
  const buf = SR_SECONDS(ctx, 0.9);
  const data = buf.getChannelData(0);
  const sr = ctx.sampleRate;
  for (let i = 0; i < data.length; i++) {
    const t = i / sr;
    const freq = 60 * Math.exp(-t * 4) + 38;
    data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 3.2) * 0.9;
  }
  return buf;
}

// --- Tonal / loop generators ---------------------------------------------

function makeBassLoop(bpm: number, root: number): (ctx: BaseAudioContext) => AudioBuffer {
  return (ctx) => {
    const beat = 60 / bpm;
    const beats = 4;
    const buf = SR_SECONDS(ctx, beat * beats + 0.1);
    const data = buf.getChannelData(0);
    const sr = ctx.sampleRate;
    const pattern = [0, 0, 7, 5]; // semitone offsets per beat
    for (let b = 0; b < beats; b++) {
      const freq = noteToFreq(root + pattern[b % pattern.length] - 12);
      const startF = Math.floor(b * beat * sr);
      const lenF = Math.floor(beat * 0.9 * sr);
      for (let i = 0; i < lenF; i++) {
        const t = i / sr;
        const amp = envelope(t, 0.005, 0.18) * 0.5;
        const sig =
          Math.sin(2 * Math.PI * freq * t) +
          0.3 * Math.sin(2 * Math.PI * freq * 2 * t);
        data[startF + i] += sig * amp;
      }
    }
    return buf;
  };
}

function makeChord(root: number, intervals: number[], seconds: number) {
  return (ctx: BaseAudioContext) => {
    const buf = SR_SECONDS(ctx, seconds);
    const data = buf.getChannelData(0);
    const sr = ctx.sampleRate;
    const freqs = intervals.map((iv) => noteToFreq(root + iv));
    for (let i = 0; i < data.length; i++) {
      const t = i / sr;
      const amp = envelope(t, 0.02, seconds * 0.6) * 0.18;
      let s = 0;
      for (const f of freqs) {
        s += Math.sin(2 * Math.PI * f * t) + 0.2 * Math.sin(2 * Math.PI * f * 2 * t);
      }
      data[i] = (s / freqs.length) * amp;
    }
    return buf;
  };
}

function makeLeadArp(bpm: number, root: number): (ctx: BaseAudioContext) => AudioBuffer {
  return (ctx) => {
    const beat = 60 / bpm;
    const step = beat / 2; // 8th notes
    const steps = 8;
    const buf = SR_SECONDS(ctx, step * steps + 0.2);
    const data = buf.getChannelData(0);
    const sr = ctx.sampleRate;
    const seq = [0, 4, 7, 12, 7, 4, 7, 12];
    for (let s = 0; s < steps; s++) {
      const freq = noteToFreq(root + seq[s % seq.length]);
      const startF = Math.floor(s * step * sr);
      const lenF = Math.floor(step * 0.95 * sr);
      for (let i = 0; i < lenF; i++) {
        const t = i / sr;
        const amp = envelope(t, 0.005, 0.12) * 0.25;
        const sig =
          Math.sign(Math.sin(2 * Math.PI * freq * t)) * 0.3 +
          Math.sin(2 * Math.PI * freq * t) * 0.7;
        data[startF + i] += sig * amp;
      }
    }
    return buf;
  };
}

function makeVocalChop(ctx: BaseAudioContext): AudioBuffer {
  const buf = SR_SECONDS(ctx, 0.5);
  const data = buf.getChannelData(0);
  const sr = ctx.sampleRate;
  const base = noteToFreq(3); // ~C5-ish
  for (let i = 0; i < data.length; i++) {
    const t = i / sr;
    const vibrato = 1 + 0.02 * Math.sin(2 * Math.PI * 6 * t);
    // simple formant stack
    const s =
      Math.sin(2 * Math.PI * base * vibrato * t) * 0.5 +
      Math.sin(2 * Math.PI * base * 2 * vibrato * t) * 0.25 +
      Math.sin(2 * Math.PI * base * 3 * vibrato * t) * 0.12;
    data[i] = s * envelope(t, 0.03, 0.25) * 0.5;
  }
  return buf;
}

export const SAMPLE_LIBRARY: SampleDef[] = [
  { id: "kick-808", name: "808 Kick", category: "Drums", type: "drum", bpm: null, key: "-", loopBeats: 1, generate: makeKick },
  { id: "snare-heavy", name: "Heavy Snare", category: "Drums", type: "drum", bpm: null, key: "-", loopBeats: 1, generate: makeSnare },
  { id: "hat-closed", name: "Closed Hi-Hat", category: "Drums", type: "drum", bpm: null, key: "-", loopBeats: 1, generate: makeHat },
  { id: "clap-808", name: "808 Clap", category: "Drums", type: "drum", bpm: null, key: "-", loopBeats: 1, generate: makeClap },
  { id: "sub-808", name: "808 Sub", category: "Bass", type: "synth", bpm: null, key: "C", loopBeats: 1, generate: make808 },
  { id: "bass-loop-am", name: "Deep Bassline", category: "Bass", type: "synth", bpm: 120, key: "Am", loopBeats: 4, generate: makeBassLoop(120, 0) },
  { id: "bass-loop-e", name: "Sub Bass Groove", category: "Bass", type: "synth", bpm: 128, key: "E", loopBeats: 4, generate: makeBassLoop(128, 7) },
  { id: "chord-cm", name: "Lo-Fi Piano Cm", category: "Synths", type: "synth", bpm: null, key: "Cm", loopBeats: 4, generate: makeChord(3, [0, 3, 7], 1.8) },
  { id: "pad-fmaj", name: "Warm Pad Fmaj", category: "Synths", type: "synth", bpm: null, key: "F", loopBeats: 4, generate: makeChord(-4, [0, 4, 7, 11], 2.4) },
  { id: "lead-arp", name: "Pluck Lead Arp", category: "Synths", type: "synth", bpm: 120, key: "Am", loopBeats: 4, generate: makeLeadArp(120, 12) },
  { id: "vocal-chop", name: "Vocal Chop", category: "Vocals", type: "audio", bpm: null, key: "Am", loopBeats: 1, generate: makeVocalChop },
];

export const SAMPLE_BY_ID = new Map(SAMPLE_LIBRARY.map((s) => [s.id, s]));
