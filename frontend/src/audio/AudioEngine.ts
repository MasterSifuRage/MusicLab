// MusicLab audio engine built directly on the Web Audio API.
//
// Responsibilities:
//  - own a single AudioContext + master bus (gain, analyser, limiter)
//  - hold a registry of decoded/synthesized AudioBuffers
//  - build a per-track signal chain (gain -> EQ -> panner -> master, + reverb send)
//  - schedule clip playback along a beat-based timeline
//  - drive a metronome and report the playhead position
//  - render the arrangement offline to a WAV blob

import type { Clip, MidiNote, ProjectState, Track } from "../types";
import { SAMPLE_BY_ID } from "./synth";
import { audioBufferToWav } from "./wav";

interface TrackChain {
  input: GainNode; // volume + mute/solo
  eq: BiquadFilterNode;
  panner: StereoPannerNode;
  analyser: AnalyserNode;
  reverbSend: GainNode;
  delaySend: GainNode;
}

type AssetLoader = (assetId: string) => Promise<ArrayBuffer>;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private masterAnalyser!: AnalyserNode;
  private convolver!: ConvolverNode;
  private delayInput!: GainNode;
  private delayNode!: DelayNode;
  private delayFeedback!: GainNode;
  private delayWet!: GainNode;
  private buffers = new Map<string, AudioBuffer>();
  private chains = new Map<string, TrackChain>();
  private activeSources: AudioBufferSourceNode[] = [];
  private previewSource: AudioBufferSourceNode | null = null;

  private playing = false;
  private playStartCtxTime = 0;
  private playStartBeat = 0;
  private bpm = 120;
  private state: ProjectState | null = null;

  private metronomeOn = false;
  private metroTimer: number | null = null;
  private metroNextBeat = 0;

  private loop = false;
  private lengthBeats = 64;
  private midiSources: OscillatorNode[] = [];

  // --- lifecycle ---------------------------------------------------------

  private ensureContext() {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.masterAnalyser = this.ctx.createAnalyser();
      this.masterAnalyser.fftSize = 256;
      this.convolver = this.ctx.createConvolver();
      this.convolver.buffer = this.makeImpulse(2.2, 2.5);
      this.convolver.connect(this.master);

      this.delayInput = this.ctx.createGain();
      this.delayNode = this.ctx.createDelay(2.0);
      this.delayNode.delayTime.value = 0.375;
      this.delayFeedback = this.ctx.createGain();
      this.delayFeedback.gain.value = 0.42;
      this.delayWet = this.ctx.createGain();
      this.delayWet.gain.value = 0.55;
      this.delayInput.connect(this.delayNode);
      this.delayNode.connect(this.delayWet);
      this.delayWet.connect(this.master);
      this.delayNode.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayInput);

      this.master.connect(this.masterAnalyser);
      this.masterAnalyser.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  async resume() {
    const ctx = this.ensureContext();
    if (ctx.state === "suspended") await ctx.resume();
  }

  get sampleRate() {
    return this.ensureContext().sampleRate;
  }

  private makeImpulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ensureContext();
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  // --- buffers -----------------------------------------------------------

  getSampleBuffer(sampleId: string): AudioBuffer | null {
    if (this.buffers.has("s:" + sampleId)) return this.buffers.get("s:" + sampleId)!;
    const def = SAMPLE_BY_ID.get(sampleId);
    if (!def) return null;
    const buf = def.generate(this.ensureContext());
    this.buffers.set("s:" + sampleId, buf);
    return buf;
  }

  async loadAsset(assetId: string, data: ArrayBuffer): Promise<AudioBuffer> {
    if (this.buffers.has("a:" + assetId)) return this.buffers.get("a:" + assetId)!;
    const ctx = this.ensureContext();
    const buf = await ctx.decodeAudioData(data.slice(0));
    this.buffers.set("a:" + assetId, buf);
    return buf;
  }

  hasAsset(assetId: string) {
    return this.buffers.has("a:" + assetId);
  }

  private bufferForClip(clip: { assetId?: string; sampleId?: string }): AudioBuffer | null {
    if (clip.sampleId) return this.getSampleBuffer(clip.sampleId);
    if (clip.assetId) return this.buffers.get("a:" + clip.assetId) ?? null;
    return null;
  }

  /** Public accessor used by the UI to draw waveforms. */
  getClipBuffer(clip: { assetId?: string; sampleId?: string }): AudioBuffer | null {
    return this.bufferForClip(clip);
  }

  /** Downsample a clip's buffer into min/max peak pairs for waveform drawing. */
  getClipPeaks(clip: { assetId?: string; sampleId?: string }, buckets: number): number[] {
    const buffer = this.bufferForClip(clip);
    if (!buffer) return [];
    const data = buffer.getChannelData(0);
    const block = Math.max(1, Math.floor(data.length / buckets));
    const peaks: number[] = [];
    for (let b = 0; b < buckets; b++) {
      let peak = 0;
      const start = b * block;
      for (let i = 0; i < block && start + i < data.length; i++) {
        const v = Math.abs(data[start + i]);
        if (v > peak) peak = v;
      }
      peaks.push(peak);
    }
    return peaks;
  }

  /** Decode any asset buffers referenced by the project that aren't loaded yet. */
  async ensureLoaded(state: ProjectState, loadAssetData: AssetLoader) {
    const assetIds = new Set<string>();
    for (const track of state.tracks) {
      for (const clip of track.clips) {
        if (clip.assetId && !this.hasAsset(clip.assetId)) assetIds.add(clip.assetId);
      }
    }
    await Promise.all(
      [...assetIds].map(async (id) => {
        try {
          const data = await loadAssetData(id);
          await this.loadAsset(id, data);
        } catch {
          /* asset missing — clip will be silent */
        }
      })
    );
  }

  // --- track chains ------------------------------------------------------

  private buildChain(): TrackChain {
    const ctx = this.ensureContext();
    const input = ctx.createGain();
    const eq = ctx.createBiquadFilter();
    eq.type = "peaking";
    eq.frequency.value = 1200;
    eq.gain.value = 0;
    const panner = ctx.createStereoPanner();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const reverbSend = ctx.createGain();
    reverbSend.gain.value = 0;
    const delaySend = ctx.createGain();
    delaySend.gain.value = 0;

    input.connect(eq);
    eq.connect(panner);
    panner.connect(analyser);
    analyser.connect(this.master); // dry
    panner.connect(reverbSend);
    reverbSend.connect(this.convolver); // wet
    panner.connect(delaySend);
    delaySend.connect(this.delayInput);
    return { input, eq, panner, analyser, reverbSend, delaySend };
  }

  private getChain(trackId: string): TrackChain {
    let chain = this.chains.get(trackId);
    if (!chain) {
      chain = this.buildChain();
      this.chains.set(trackId, chain);
    }
    return chain;
  }

  private computeTrackGain(track: Track, anySolo: boolean): number {
    if (track.muted) return 0;
    if (anySolo && !track.solo) return 0;
    return track.volume / 100;
  }

  /** Apply mixer values (volume/pan/mute/solo/fx) live, without restarting. */
  applyMix(state: ProjectState) {
    this.state = state;
    this.bpm = state.bpm;
    this.lengthBeats = this.computeLengthBeats(state);
    const ctx = this.ensureContext();
    const anySolo = state.tracks.some((t) => t.solo);
    for (const track of state.tracks) {
      const chain = this.getChain(track.id);
      const now = ctx.currentTime;
      chain.input.gain.setTargetAtTime(this.computeTrackGain(track, anySolo), now, 0.02);
      chain.panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, track.pan / 50)), now, 0.02);
      chain.eq.gain.setTargetAtTime(track.eq ? 4 : 0, now, 0.02);
      chain.reverbSend.gain.setTargetAtTime((track.reverb ?? 0) / 100, now, 0.02);
      chain.delaySend.gain.setTargetAtTime((track.delay ?? 0) / 100, now, 0.02);
    }
    this.master.gain.setTargetAtTime(state.masterVolume / 100, ctx.currentTime, 0.02);
  }

  // --- transport ---------------------------------------------------------

  private computeLengthBeats(state: ProjectState): number {
    let max = 0;
    for (const t of state.tracks)
      for (const c of t.clips) max = Math.max(max, c.start + c.duration);
    return Math.max(16, Math.ceil(max));
  }

  async play(state: ProjectState, fromBeat: number) {
    await this.resume();
    const ctx = this.ensureContext();
    this.stopSources();
    this.state = state;
    this.bpm = state.bpm;
    this.lengthBeats = this.computeLengthBeats(state);
    this.applyMix(state);

    const spb = 60 / state.bpm;
    const t0 = ctx.currentTime + 0.08;
    this.playStartCtxTime = t0;
    this.playStartBeat = fromBeat;
    this.playing = true;

    for (const track of state.tracks) {
      const chain = this.getChain(track.id);
      for (const clip of track.clips) {
        const clipEnd = clip.start + clip.duration;
        if (clipEnd <= fromBeat) continue;

        if (clip.type === "midi" && clip.notes?.length) {
          for (const note of clip.notes) {
            this.scheduleMidiNote(note, clip.start, chain, fromBeat, spb, t0);
          }
          continue;
        }

        const buffer = this.bufferForClip(clip);
        if (!buffer) continue;

        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(chain.input);

        const beatsUntilStart = Math.max(0, clip.start - fromBeat);
        const when = t0 + beatsUntilStart * spb;
        const intoClipSeconds =
          clip.start < fromBeat ? (fromBeat - clip.start) * spb : 0;
        const offset = (clip.offset ?? 0) + intoClipSeconds;
        const playSeconds = clip.duration * spb - intoClipSeconds;

        try {
          if (offset < buffer.duration) {
            src.start(when, offset, Math.min(playSeconds, buffer.duration - offset));
          }
        } catch {
          /* ignore scheduling errors */
        }
        this.activeSources.push(src);
      }
    }

    if (this.metronomeOn) this.startMetronome(fromBeat);
  }

  pause(): number {
    const pos = this.getPositionBeats();
    this.stopSources();
    this.playing = false;
    this.stopMetronome();
    return pos;
  }

  stop() {
    this.stopSources();
    this.playing = false;
    this.playStartBeat = 0;
    this.stopMetronome();
  }

  private stopSources() {
    for (const s of this.activeSources) {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    }
    this.activeSources = [];
    for (const o of this.midiSources) {
      try {
        o.stop();
      } catch {
        /* noop */
      }
    }
    this.midiSources = [];
  }

  private midiFreq(pitch: number) {
    return 440 * Math.pow(2, (pitch - 69) / 12);
  }

  private scheduleMidiNote(
    note: MidiNote,
    clipStartBeat: number,
    chain: TrackChain,
    fromBeat: number,
    spb: number,
    t0: number
  ) {
    const ctx = this.ctx!;
    const noteStartBeat = clipStartBeat + note.start;
    const noteEndBeat = noteStartBeat + note.duration;
    if (noteEndBeat <= fromBeat) return;

    const beatsUntil = Math.max(0, noteStartBeat - fromBeat);
    const when = t0 + beatsUntil * spb;
    const intoNote = noteStartBeat < fromBeat ? (fromBeat - noteStartBeat) * spb : 0;
    const playSeconds = note.duration * spb - intoNote;
    if (playSeconds <= 0) return;

    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = this.midiFreq(note.pitch);
    const gain = ctx.createGain();
    const vel = (note.velocity ?? 100) / 127;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(vel * 0.35, when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + playSeconds);
    osc.connect(gain);
    gain.connect(chain.input);
    osc.start(when);
    osc.stop(when + playSeconds + 0.05);
    this.midiSources.push(osc);
  }

  getPositionBeats(): number {
    if (!this.playing || !this.ctx) return this.playStartBeat;
    const spb = 60 / this.bpm;
    return this.playStartBeat + (this.ctx.currentTime - this.playStartCtxTime) / spb;
  }

  get isPlaying() {
    return this.playing;
  }
  get lengthInBeats() {
    return this.lengthBeats;
  }
  setLoop(on: boolean) {
    this.loop = on;
  }

  // --- metronome ---------------------------------------------------------

  setMetronome(on: boolean, fromBeat = 0) {
    this.metronomeOn = on;
    if (on && this.playing) this.startMetronome(fromBeat || this.getPositionBeats());
    else if (!on) this.stopMetronome();
  }

  private startMetronome(fromBeat: number) {
    this.stopMetronome();
    this.metroNextBeat = Math.ceil(fromBeat);
    const spb = 60 / this.bpm;
    const tick = () => {
      if (!this.ctx) return;
      const ahead = this.ctx.currentTime + 0.2;
      while (true) {
        const when = this.playStartCtxTime + (this.metroNextBeat - this.playStartBeat) * spb;
        if (when > ahead) break;
        if (when >= this.ctx.currentTime) {
          const accent = this.metroNextBeat % (this.state?.timeSig[0] ?? 4) === 0;
          this.scheduleClick(when, accent);
        }
        this.metroNextBeat++;
      }
    };
    tick();
    this.metroTimer = window.setInterval(tick, 60);
  }

  private scheduleClick(when: number, accent: boolean) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = accent ? 1600 : 1000;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.3, when + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(when);
    osc.stop(when + 0.06);
  }

  private stopMetronome() {
    if (this.metroTimer !== null) {
      clearInterval(this.metroTimer);
      this.metroTimer = null;
    }
  }

  // --- preview -----------------------------------------------------------

  async previewBuffer(buffer: AudioBuffer) {
    await this.resume();
    const ctx = this.ensureContext();
    this.stopPreview();
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.9;
    src.connect(gain);
    gain.connect(this.master);
    src.start();
    this.previewSource = src;
    src.onended = () => {
      if (this.previewSource === src) this.previewSource = null;
    };
  }

  async previewSample(sampleId: string) {
    const buf = this.getSampleBuffer(sampleId);
    if (buf) await this.previewBuffer(buf);
  }

  async previewAsset(assetId: string, data?: ArrayBuffer) {
    let buf = this.buffers.get("a:" + assetId) ?? null;
    if (!buf && data) buf = await this.loadAsset(assetId, data);
    if (buf) await this.previewBuffer(buf);
  }

  stopPreview() {
    if (this.previewSource) {
      try {
        this.previewSource.stop();
      } catch {
        /* noop */
      }
      this.previewSource = null;
    }
  }

  // --- meters ------------------------------------------------------------

  private rms(analyser: AnalyserNode): number {
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    return Math.min(1, Math.sqrt(sum / data.length) * 2.5);
  }

  getMasterLevel(): number {
    if (!this.ctx) return 0;
    return this.rms(this.masterAnalyser);
  }

  getTrackLevel(trackId: string): number {
    const chain = this.chains.get(trackId);
    if (!chain) return 0;
    return this.rms(chain.analyser);
  }

  // --- offline render ----------------------------------------------------

  async renderToWav(state: ProjectState): Promise<Blob> {
    const sr = this.sampleRate;
    const spb = 60 / state.bpm;
    const lengthBeats = this.computeLengthBeats(state);
    const tail = 2.5 + (state.tracks.some((t) => (t.delay ?? 0) > 0) ? 1.8 : 0);
    const totalSeconds = lengthBeats * spb + tail;
    const offline = new OfflineAudioContext(2, Math.ceil(totalSeconds * sr), sr);

    const master = offline.createGain();
    master.gain.value = state.masterVolume / 100;
    const convolver = offline.createConvolver();
    convolver.buffer = this.makeImpulse(2.2, 2.5);
    convolver.connect(master);

    const delayInput = offline.createGain();
    const delayNode = offline.createDelay(2.0);
    delayNode.delayTime.value = 0.375;
    const delayFeedback = offline.createGain();
    delayFeedback.gain.value = 0.42;
    const delayWet = offline.createGain();
    delayWet.gain.value = 0.55;
    delayInput.connect(delayNode);
    delayNode.connect(delayWet);
    delayWet.connect(master);
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayInput);

    master.connect(offline.destination);

    const anySolo = state.tracks.some((t) => t.solo);
    for (const track of state.tracks) {
      const input = offline.createGain();
      input.gain.value = this.computeTrackGain(track, anySolo);
      const eq = offline.createBiquadFilter();
      eq.type = "peaking";
      eq.frequency.value = 1200;
      eq.gain.value = track.eq ? 4 : 0;
      const panner = offline.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, track.pan / 50));
      const reverbSend = offline.createGain();
      reverbSend.gain.value = (track.reverb ?? 0) / 100;
      const delaySend = offline.createGain();
      delaySend.gain.value = (track.delay ?? 0) / 100;

      input.connect(eq);
      eq.connect(panner);
      panner.connect(master);
      panner.connect(reverbSend);
      reverbSend.connect(convolver);
      panner.connect(delaySend);
      delaySend.connect(delayInput);

      for (const clip of track.clips) {
        if (clip.type === "midi" && clip.notes?.length) {
          for (const note of clip.notes) {
            const osc = offline.createOscillator();
            osc.type = "triangle";
            osc.frequency.value = this.midiFreq(note.pitch);
            const g = offline.createGain();
            const vel = (note.velocity ?? 100) / 127;
            const when = (clip.start + note.start) * spb;
            const dur = note.duration * spb;
            g.gain.setValueAtTime(0.0001, when);
            g.gain.exponentialRampToValueAtTime(vel * 0.35, when + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
            osc.connect(g);
            g.connect(input);
            osc.start(when);
            osc.stop(when + dur + 0.05);
          }
          continue;
        }

        const buffer = this.bufferForClip(clip);
        if (!buffer) continue;
        const src = offline.createBufferSource();
        src.buffer = buffer;
        src.connect(input);
        const when = clip.start * spb;
        const offset = clip.offset ?? 0;
        if (offset < buffer.duration) {
          src.start(when, offset, Math.min(clip.duration * spb, buffer.duration - offset));
        }
      }
    }

    const rendered = await offline.startRendering();
    return audioBufferToWav(rendered);
  }
}

export const audioEngine = new AudioEngine();
