// Server-side procedural sample generators (mirrors frontend synth.ts).

import { createPcm, type PcmBuffer } from "./pcm.js";

const SR = 44100;

function secondsBuf(seconds: number): Float32Array {
  return new Float32Array(Math.max(1, Math.ceil(SR * seconds)));
}

const noteToFreq = (semi: number) => 440 * Math.pow(2, semi / 12);

function envelope(t: number, attack: number, decay: number) {
  if (t < attack) return t / attack;
  return Math.exp(-(t - attack) / decay);
}

function makeKick(): PcmBuffer {
  const data = secondsBuf(0.5);
  for (let i = 0; i < data.length; i++) {
    const t = i / SR;
    const freq = 150 * Math.exp(-t * 35) + 45;
    data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 9);
  }
  return { channels: [data, data.slice()], sampleRate: SR, length: data.length };
}

function makeSnare(): PcmBuffer {
  const data = secondsBuf(0.3);
  for (let i = 0; i < data.length; i++) {
    const t = i / SR;
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 22);
    const tone = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 30) * 0.7;
    data[i] = noise * 0.8 + tone;
  }
  return { channels: [data, data.slice()], sampleRate: SR, length: data.length };
}

function makeHat(): PcmBuffer {
  const data = secondsBuf(0.12);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const t = i / SR;
    const white = Math.random() * 2 - 1;
    const hp = white - last;
    last = white;
    data[i] = hp * Math.exp(-t * 55);
  }
  return { channels: [data, data.slice()], sampleRate: SR, length: data.length };
}

function make808(): PcmBuffer {
  const data = secondsBuf(0.9);
  for (let i = 0; i < data.length; i++) {
    const t = i / SR;
    const freq = 60 * Math.exp(-t * 4) + 38;
    data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 3.2) * 0.9;
  }
  return { channels: [data, data.slice()], sampleRate: SR, length: data.length };
}

function makeBassLoop(bpm: number, root: number): PcmBuffer {
  const beat = 60 / bpm;
  const beats = 4;
  const data = secondsBuf(beat * beats + 0.1);
  const pattern = [0, 0, 7, 5];
  for (let b = 0; b < beats; b++) {
    const freq = noteToFreq(root + pattern[b % pattern.length] - 12);
    const startF = Math.floor(b * beat * SR);
    const lenF = Math.floor(beat * 0.9 * SR);
    for (let i = 0; i < lenF; i++) {
      const t = i / SR;
      const amp = envelope(t, 0.005, 0.18) * 0.5;
      const sig = Math.sin(2 * Math.PI * freq * t) + 0.3 * Math.sin(2 * Math.PI * freq * 2 * t);
      data[startF + i] += sig * amp;
    }
  }
  return { channels: [data, data.slice()], sampleRate: SR, length: data.length };
}

function makeLeadArp(bpm: number, root: number): PcmBuffer {
  const beat = 60 / bpm;
  const step = beat / 2;
  const steps = 8;
  const data = secondsBuf(step * steps + 0.2);
  const seq = [0, 4, 7, 12, 7, 4, 7, 12];
  for (let s = 0; s < steps; s++) {
    const freq = noteToFreq(root + seq[s % seq.length]);
    const startF = Math.floor(s * step * SR);
    const lenF = Math.floor(step * 0.95 * SR);
    for (let i = 0; i < lenF; i++) {
      const t = i / SR;
      const amp = envelope(t, 0.005, 0.12) * 0.25;
      const sig =
        Math.sign(Math.sin(2 * Math.PI * freq * t)) * 0.3 +
        Math.sin(2 * Math.PI * freq * t) * 0.7;
      data[startF + i] += sig * amp;
    }
  }
  return { channels: [data, data.slice()], sampleRate: SR, length: data.length };
}

function makeVocalChop(): PcmBuffer {
  const data = secondsBuf(0.5);
  const base = noteToFreq(3);
  for (let i = 0; i < data.length; i++) {
    const t = i / SR;
    const vibrato = 1 + 0.02 * Math.sin(2 * Math.PI * 6 * t);
    const s =
      Math.sin(2 * Math.PI * base * vibrato * t) * 0.5 +
      Math.sin(2 * Math.PI * base * 2 * vibrato * t) * 0.25 +
      Math.sin(2 * Math.PI * base * 3 * vibrato * t) * 0.12;
    data[i] = s * envelope(t, 0.03, 0.25) * 0.5;
  }
  return { channels: [data, data.slice()], sampleRate: SR, length: data.length };
}

const GENERATORS: Record<string, () => PcmBuffer> = {
  "kick-808": makeKick,
  "snare-heavy": makeSnare,
  "hat-closed": makeHat,
  "clap-808": makeSnare,
  "sub-808": make808,
  "bass-loop-am": () => makeBassLoop(120, 0),
  "bass-loop-e": () => makeBassLoop(128, 7),
  "lead-arp": () => makeLeadArp(120, 12),
  "vocal-chop": makeVocalChop,
};

export function getSampleBuffer(sampleId: string): PcmBuffer | null {
  const gen = GENERATORS[sampleId];
  return gen ? gen() : null;
}

export function renderMidiNote(pitch: number, durationSec: number, velocity = 100): PcmBuffer {
  const data = secondsBuf(durationSec + 0.05);
  const freq = 440 * Math.pow(2, (pitch - 69) / 12);
  const vel = velocity / 127;
  for (let i = 0; i < data.length; i++) {
    const t = i / SR;
    const amp = envelope(t, 0.01, durationSec * 0.35) * vel * 0.35;
    data[i] = Math.sin(2 * Math.PI * freq * t) * amp;
  }
  return { channels: [data, data.slice()], sampleRate: SR, length: data.length };
}

export function emptyBuffer(seconds: number): PcmBuffer {
  return createPcm(seconds, 2, SR);
}
