import React, { useEffect, useRef, useState } from "react";
import { Resizable } from "re-resizable";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import {
  Play, Pause, SkipBack, SkipForward, Circle, Save, ChevronLeft, Settings,
  Mic, Music, MonitorSpeaker, Drum, Search, Plus, Repeat, Download,
  ChevronRight, Maximize2, ListMusic, Scissors, Clock, X, Menu, Trash2, Upload, Grid3x3,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useEditorStore } from "../../store/editorStore";
import { useCollabStore } from "../../store/collabStore";
import { audioEngine } from "../../audio/AudioEngine";
import { assetService } from "../../services/assets";
import { projectService } from "../../services/projects";
import { renderService } from "../../services/render";
import { collabClient } from "../../services/collab";
import { SAMPLE_LIBRARY } from "../../audio/synth";
import { getSettings } from "../../lib/session";
import { waveformBucketCount, midiClipBarCount } from "../../lib/waveform";
import { exportClipToMidi, exportProjectMidi, downloadMidiBytes } from "../../audio/midiIo";
import { QUANTIZE_OPTIONS, type QuantizeGrid } from "../../audio/quantize";
import { PianoRoll } from "../components/PianoRoll";
import { CollabPanel } from "../components/CollabPanel";
import { MusicLabLogo } from "../components/MusicLabLogo";
import type { Asset, Clip, Track, TrackType } from "../../types";

const TRACK_H = 64;
const BARS = 32;

const GRID_OPTIONS: Record<string, number> = { "1/4": 1, "1/8": 0.5, "1/16": 0.25, Off: 0 };

function snap(value: number, div: number) {
  return div > 0 ? Math.round(value / div) * div : value;
}

function trackIcon(type: TrackType) {
  switch (type) {
    case "drum": return <Drum className="w-3.5 h-3.5" />;
    case "synth": return <Music className="w-3.5 h-3.5" />;
    case "audio": return <Mic className="w-3.5 h-3.5" />;
    default: return <MonitorSpeaker className="w-3.5 h-3.5" />;
  }
}

// --- LCD + playhead (subscribe to live position) -------------------------

function LcdDisplay() {
  const positionBeats = useEditorStore((s) => s.positionBeats);
  const bpm = useEditorStore((s) => s.project?.state.bpm ?? 120);
  const sig = useEditorStore((s) => s.project?.state.timeSig ?? [4, 4]);
  const setBpm = useEditorStore((s) => s.setBpm);

  const spb = 60 / bpm;
  const seconds = positionBeats * spb;
  const mm = Math.floor(seconds / 60);
  const ss = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  const bpb = sig[0];
  const bar = Math.floor(positionBeats / bpb) + 1;
  const beat = Math.floor(positionBeats % bpb) + 1;
  const tick = Math.floor((positionBeats % 1) * 4) + 1;

  return (
    <div className="bg-[#111111] border border-[#3e3e42] rounded-[2px] px-3 py-1 flex items-center gap-5 font-mono text-[11px] shadow-inner text-[#0ea5e9]">
      <div className="flex flex-col items-center leading-tight">
        <span className="text-[9px] text-[#666666] uppercase">Time</span>
        <span className="text-[13px] tracking-wide tabular-nums">
          {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}.{String(cs).padStart(2, "0")}
        </span>
      </div>
      <div className="w-px h-5 bg-[#333333]" />
      <div className="flex flex-col items-center leading-tight">
        <span className="text-[9px] text-[#666666] uppercase">Bars</span>
        <span className="text-[13px] tracking-wide tabular-nums">{bar}.{beat}.{tick}</span>
      </div>
      <div className="w-px h-5 bg-[#333333]" />
      <div className="flex items-center gap-3">
        <div className="flex flex-col leading-tight">
          <span className="text-[9px] text-[#666666] uppercase">Tempo</span>
          <input
            type="number"
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="bg-transparent text-[#0ea5e9] text-[12px] w-10 focus:outline-none"
          />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[9px] text-[#666666] uppercase">Sig</span>
          <span className="text-[12px]">{sig[0]}/{sig[1]}</span>
        </div>
      </div>
    </div>
  );
}

function Playhead({ pxPerBeat }: { pxPerBeat: number }) {
  const positionBeats = useEditorStore((s) => s.positionBeats);
  return (
    <div
      className="absolute top-0 bottom-0 w-px bg-[#0ea5e9] z-20 pointer-events-none"
      style={{ left: `${positionBeats * pxPerBeat}px` }}
    >
      <div className="absolute -top-[1px] -translate-x-1/2 w-2 h-2 bg-[#0ea5e9]" />
    </div>
  );
}

// --- meters (self-animating, no React state) -----------------------------

function Meter({ trackId, master = false, className }: { trackId?: string; master?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const level = master ? audioEngine.getMasterLevel() : trackId ? audioEngine.getTrackLevel(trackId) : 0;
      if (ref.current) ref.current.style.height = `${Math.min(100, level * 100)}%`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [trackId, master]);
  return (
    <div className={`bg-[#111] border border-[#000] rounded-[1px] flex flex-col justify-end overflow-hidden ${className}`}>
      <div ref={ref} className="w-full bg-gradient-to-t from-green-500 via-yellow-400 to-red-500" style={{ height: "0%" }} />
    </div>
  );
}

// --- waveform / midi clip content ----------------------------------------

function ClipContent({
  clip,
  color,
  width,
  hqPreview,
}: {
  clip: Clip;
  color: string;
  width: number;
  hqPreview: boolean;
}) {
  if (clip.type === "audio") {
    const buckets = waveformBucketCount(width, hqPreview);
    const peaks = audioEngine.getClipPeaks(clip, buckets);
    if (peaks.length === 0) return null;
    const mid = 25;
    const path =
      "M 0 25 " +
      peaks.map((p, i) => `L ${(i / peaks.length) * 100} ${mid - p * 22}`).join(" ") +
      " " +
      peaks.map((p, i) => `L ${((peaks.length - i) / peaks.length) * 100} ${mid + peaks[peaks.length - 1 - i] * 22}`).join(" ");
    return (
      <svg className="w-full h-full opacity-90" preserveAspectRatio="none" viewBox="0 0 100 50">
        <path d={path} fill={color} stroke="none" opacity={hqPreview ? 0.92 : 0.85} />
      </svg>
    );
  }
  const bars = midiClipBarCount(width, hqPreview);
  const peaks = audioEngine.getClipPeaks(clip, bars);
  return (
    <div className="w-full h-full relative opacity-90">
      {peaks.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-[1px]"
          style={{
            left: `${(i / peaks.length) * 100}%`,
            bottom: "10%",
            width: `${90 / peaks.length}%`,
            height: `${10 + p * 70}%`,
            backgroundColor: color,
          }}
        />
      ))}
    </div>
  );
}

// --- mixer fader ----------------------------------------------------------

function Fader({ value, onChange, color = "#444" }: { value: number; onChange: (v: number) => void; color?: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const setFromY = (clientY: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = 1 - (clientY - rect.top) / rect.height;
    onChange(Math.max(0, Math.min(100, Math.round(pct * 100))));
  };
  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setFromY(e.clientY);
    const move = (ev: PointerEvent) => setFromY(ev.clientY);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <div ref={trackRef} onPointerDown={onPointerDown} className="flex-1 bg-[#181818] border border-[#111] rounded-[1px] relative flex justify-center cursor-ns-resize">
      <div className="w-full h-3 border-y border-[#666] absolute z-10 shadow-sm" style={{ bottom: `calc(${value}% - 6px)`, backgroundColor: color }} />
    </div>
  );
}

// --- main editor ----------------------------------------------------------

export function MusicEditor() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const user = useAuthStore((s) => s.user)!;

  // Subscribe granularly so the per-frame `positionBeats` (read by the Playhead
  // and LCD only) does not re-render the whole arranger during playback.
  const project = useEditorStore((s) => s.project);
  const loading = useEditorStore((s) => s.loading);
  const dirty = useEditorStore((s) => s.dirty);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const tool = useEditorStore((s) => s.tool);
  const metronomeOn = useEditorStore((s) => s.metronomeOn);
  const loopOn = useEditorStore((s) => s.loopOn);
  const selectedTrackId = useEditorStore((s) => s.selectedTrackId);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const pxPerBeat = useEditorStore((s) => s.pxPerBeat);
  const readOnly = useCollabStore((s) => s.readOnly);
  const remoteCursors = useCollabStore((s) => s.remoteCursors);

  const {
    loadProject, save, rename, play, pause, stop, seek, setMetronome, setLoop, setTool,
    addTrack, removeTrack, updateTrack, toggleMute, toggleSolo, toggleArm, selectTrack,
    setMasterVolume, addClipFromSample, addClipFromAsset, addMidiClip, updateClip, removeClip,
    splitClip, joinClip, selectClip, setClipNotes, setPxPerBeat, undo, redo, applyRemoteState,
    importMidiToClip, quantizeMidiClip,
  } = useEditorStore.getState();

  const [showRightPanel, setShowRightPanel] = useState(true);
  const [bottomPanelTab, setBottomPanelTab] = useState<"mixer" | "effects" | "midi">("mixer");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMode, setExportMode] = useState<"local" | "server">("local");
  const [renderProgress, setRenderProgress] = useState(0);
  const [grid, setGrid] = useState("1/4");
  const [search, setSearch] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const lanesRef = useRef<HTMLDivElement>(null);
  const midiImportRef = useRef<HTMLInputElement>(null);
  const [quantizeGrid, setQuantizeGrid] = useState<QuantizeGrid>(0.25);
  const [hqPreview, setHqPreview] = useState(() => getSettings().hqPreview);

  useEffect(() => {
    const sync = () => setHqPreview(getSettings().hqPreview);
    window.addEventListener("musiclab-settings", sync);
    return () => window.removeEventListener("musiclab-settings", sync);
  }, []);

  useEffect(() => {
    loadProject(projectId, user.id);
    assetService.list(user.id).then(setAssets);
    return () => {
      stop();
      collabClient.disconnect();
      useCollabStore.getState().reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, user.id]);

  // Real-time collaboration (API mode)
  useEffect(() => {
    if (!project?.id || !renderService.isAvailable()) return;
    if (!project.id) return;

    collabClient.connect(project.id);
    const unsub = collabClient.onMessage((msg) => {
      if (msg.type === "welcome") {
        useCollabStore.getState().setConnected(true);
        useCollabStore.getState().setMyRole(msg.role as "owner" | "editor" | "viewer");
        useCollabStore.getState().setVersion(msg.version);
        applyRemoteState(msg.state, msg.version);
      } else if (msg.type === "presence") {
        useCollabStore.getState().setPresence(msg.users);
      } else if (msg.type === "state") {
        useCollabStore.getState().setRemoteState(msg.version, msg.state, msg.senderName);
        applyRemoteState(msg.state, msg.version);
        toast.info(`${msg.senderName ?? "Collaborator"} updated the project`);
      } else if (msg.type === "ack") {
        useCollabStore.getState().setVersion(msg.version);
      } else if (msg.type === "cursor") {
        useCollabStore.getState().setRemoteCursor(msg.userId, msg.username, msg.beat, msg.trackId);
      }
    });

    return () => {
      unsub();
      collabClient.disconnect();
    };
  }, [project?.id]);

  // Auto-scroll playhead during playback
  useEffect(() => {
    if (!isPlaying || !getSettings().autoScroll) return;
    const pos = useEditorStore.getState().positionBeats;
    const el = lanesRef.current;
    if (!el) return;
    const playheadX = pos * pxPerBeat;
    const margin = 120;
    if (playheadX > el.scrollLeft + el.clientWidth - margin) {
      el.scrollLeft = playheadX - el.clientWidth + margin;
    }
  });

  // close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setActiveMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      if (readOnly) return;
      if (e.code === "Space") {
        e.preventDefault();
        isPlaying ? pause() : play();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedClipId && selectedTrackId) {
          e.preventDefault();
          removeClip(selectedTrackId, selectedClipId);
        }
      } else if (e.key.toLowerCase() === "v") setTool("select");
      else if (e.key.toLowerCase() === "c") setTool("cut");
      else if (e.key.toLowerCase() === "j" && selectedClipId && selectedTrackId) {
        e.preventDefault();
        joinClip(selectedTrackId, selectedClipId);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, readOnly, selectedClipId, selectedTrackId]);

  const handleSave = async () => {
    await save();
    toast.success("Project saved.");
  };

  const handleExport = async () => {
    if (!project) return;
    setExporting(true);
    setRenderProgress(0);
    try {
      if (exportMode === "server" && renderService.isAvailable()) {
        await save();
        const job = await renderService.queue(project.id);
        const done = await renderService.pollUntilDone(job.id, (j) => setRenderProgress(j.progress));
        if (done.status === "failed") throw new Error(done.error ?? "Render failed");
        await renderService.download(done.id, `${project.name || "mixdown"}.wav`);
        toast.success("Server render complete — file downloaded.");
      } else {
        const blob = await audioEngine.renderToWav(project.state);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${project.name || "mixdown"}.wav`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Exported WAV mixdown.");
      }
      setActiveModal(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(false);
      setRenderProgress(0);
    }
  };

  const handlePublish = async () => {
    if (!project) return;
    if (project.status !== "Public") await projectService.togglePrivacy(project.id);
    await save();
    toast.success("Published to your public feed.");
    setActiveModal(null);
  };

  const beatFromClientX = (clientX: number) => {
    const el = lanesRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.max(0, (clientX - rect.left + el.scrollLeft) / pxPerBeat);
  };

  const onLaneDrop = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-musiclab");
    if (!raw) return;
    const data = JSON.parse(raw);
    const beat = snap(beatFromClientX(e.clientX), GRID_OPTIONS[grid] || 1);
    if (data.kind === "sample") addClipFromSample(trackId, data.id, beat);
    else if (data.kind === "asset") addClipFromAsset(trackId, data.id, data.name, data.durationBeats, beat);
  };

  const onClipPointerDown = (e: React.PointerEvent, track: Track, clip: Clip, mode: "move" | "left" | "right") => {
    if (readOnly) return;
    e.stopPropagation();
    selectClip(track.id, clip.id);
    if (tool === "cut" && mode === "move") {
      const beat = snap(beatFromClientX(e.clientX), GRID_OPTIONS[grid] || 0.25);
      splitClip(track.id, clip.id, beat);
      return;
    }
    const div = getSettings().snapToGrid ? GRID_OPTIONS[grid] || 0 : 0;
    const startX = e.clientX;
    const origStart = clip.start;
    const origDur = clip.duration;
    const origOffset = clip.offset ?? 0;
    const spb = 60 / (project?.state.bpm ?? 120);
    let rafPending = false;
    let lastEv: PointerEvent | null = null;

    const applyMove = () => {
      rafPending = false;
      if (!lastEv) return;
      const ev = lastEv;
      const deltaBeats = (ev.clientX - startX) / pxPerBeat;
      if (mode === "move") {
        updateClip(track.id, clip.id, { start: Math.max(0, snap(origStart + deltaBeats, div)) });
      } else if (mode === "right") {
        updateClip(track.id, clip.id, { duration: Math.max(0.25, snap(origDur + deltaBeats, div)) });
      } else {
        const newStart = Math.max(0, Math.min(origStart + origDur - 0.25, snap(origStart + deltaBeats, div)));
        const shift = newStart - origStart;
        updateClip(track.id, clip.id, { start: newStart, duration: origDur - shift, offset: origOffset + shift * spb });
      }
    };

    const move = (ev: PointerEvent) => {
      lastEv = ev;
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(applyMove);
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      applyMove();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  if (loading || !project) {
    return (
      <div className="h-screen bg-[#1e1e1e] flex items-center justify-center text-[#888888] text-sm">
        Loading editor…
      </div>
    );
  }

  const tracks = project.state.tracks;
  const selectedTrack = tracks.find((t) => t.id === selectedTrackId) ?? null;
  const selectedClip =
    selectedTrack && selectedClipId
      ? selectedTrack.clips.find((c) => c.id === selectedClipId) ?? null
      : null;
  const isOwner = project.ownerId === user.id;
  const filteredSamples = SAMPLE_LIBRARY.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
  const filteredAssets = assets.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));

  const menuItem = (label: string, shortcut: string, onClick?: () => void) => (
    <div onClick={() => { onClick?.(); setActiveMenu(null); }} className="px-4 py-1 hover:bg-[#04395e] hover:text-white cursor-pointer flex justify-between">
      <span>{label}</span>
      {shortcut && <span className="text-[#888888]">{shortcut}</span>}
    </div>
  );

  return (
    <div className="h-screen bg-[#1e1e1e] flex flex-col text-[#cccccc] font-sans text-[12px] overflow-hidden select-none">
      {readOnly && (
        <div className="h-5 bg-[#d97706]/20 border-b border-[#d97706]/40 text-[#fbbf24] text-[10px] flex items-center justify-center shrink-0">
          View-only mode — you can listen but cannot edit this project
        </div>
      )}
      {/* TOP MENU BAR */}
      <div ref={menuRef} className="h-6 bg-[#181818] border-b border-[#3e3e42] flex items-center justify-between px-2 text-[11px] shrink-0 z-50">
        <div className="flex items-center gap-1 relative">
          <MusicLabLogo size={18} className="ml-1" />
          <span className="text-[#eeeeee] px-1 font-bold tracking-widest uppercase text-[11px] opacity-90">MusicLab</span>
          <div className="w-px h-3 bg-[#3e3e42] mx-1" />
          {["File", "Edit", "View", "Track", "Help"].map((item) => (
            <div key={item} className="relative">
              <button
                className={`px-2 py-0.5 rounded-[2px] cursor-pointer transition-none ${activeMenu === item.toLowerCase() ? "bg-[#3e3e42] text-white" : "hover:bg-[#333333]"} text-[11px]`}
                onClick={() => setActiveMenu(activeMenu === item.toLowerCase() ? null : item.toLowerCase())}
                onMouseEnter={() => activeMenu && setActiveMenu(item.toLowerCase())}
              >
                {item}
              </button>
              {activeMenu === item.toLowerCase() && (
                <div className="absolute top-full left-0 mt-0 w-52 bg-[#252526] border border-[#3e3e42] shadow-2xl py-1 z-50 text-[11px] text-[#cccccc]">
                  {item === "File" && (
                    <>
                      {menuItem("New Project", "Ctrl+N", () => navigate("/editor"))}
                      {menuItem("Back to Projects", "", () => navigate("/dashboard?tab=projects"))}
                      <div className="h-px bg-[#3e3e42] my-1" />
                      {menuItem("Save", "Ctrl+S", handleSave)}
                      {menuItem("Export Audio…", "", () => setActiveModal("export"))}
                    </>
                  )}
                  {item === "Edit" && (
                    <>
                      {menuItem("Delete Selected Clip", "Del", () => selectedClipId && selectedTrackId && removeClip(selectedTrackId, selectedClipId))}
                      <div className="h-px bg-[#3e3e42] my-1" />
                      {menuItem("Select Tool", "V", () => setTool("select"))}
                      {menuItem("Cut Tool", "C", () => setTool("cut"))}
                      <div className="h-px bg-[#3e3e42] my-1" />
                      {menuItem("Join Adjacent Clips", "J", () => selectedClipId && selectedTrackId && joinClip(selectedTrackId, selectedClipId))}
                    </>
                  )}
                  {item === "View" && (
                    <>
                      {menuItem("Toggle Browser", "B", () => setShowRightPanel((v) => !v))}
                      {menuItem("Toggle Mixer", "M", () => setBottomPanelTab("mixer"))}
                    </>
                  )}
                  {item === "Track" && (
                    <>
                      {menuItem("Add Audio Track", "", () => addTrack("audio"))}
                      {menuItem("Add MIDI Track", "", () => addTrack("synth"))}
                      {menuItem("Add Drum Track", "", () => addTrack("drum"))}
                      <div className="h-px bg-[#3e3e42] my-1" />
                      {menuItem("Delete Selected Track", "", () => selectedTrackId && removeTrack(selectedTrackId))}
                    </>
                  )}
                  {item === "Help" && (
                    <>
                      {menuItem("Keyboard: Space = Play", "")}
                      {menuItem("Keyboard: Ctrl+S = Save", "")}
                      {menuItem("Keyboard: Ctrl+Z / Ctrl+Y = Undo/Redo", "")}
                      {menuItem("Keyboard: Del = Delete clip", "")}
                      {menuItem("Keyboard: J = Join adjacent clips", "")}
                      <div className="h-px bg-[#3e3e42] my-1" />
                      {menuItem("About MusicLab", "")}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <CollabPanel projectId={project.id} isOwner={isOwner} />
          <button
            onClick={() => setMetronome(!metronomeOn)}
            className={`p-0.5 rounded-[2px] transition-colors ${metronomeOn ? "text-[#0ea5e9] bg-[#0ea5e9]/20" : "text-[#888888] hover:text-[#eeeeee] hover:bg-[#333333]"}`}
            title="Metronome"
          >
            <Clock className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setActiveModal("settings")} className="p-0.5 rounded-[2px] transition-colors text-[#888888] hover:text-[#eeeeee] hover:bg-[#333333]" title="Settings">
            <Settings className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3 bg-[#3e3e42] mx-1" />
          <button onClick={handleSave} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] transition-none text-[11px] ${dirty ? "bg-[#0ea5e9] text-white hover:bg-[#0284c7]" : "bg-[#333333] text-[#eeeeee] hover:bg-[#444444]"}`}>
            <Save className="w-3.5 h-3.5" />
            {dirty ? "Save*" : "Saved"}
          </button>
          <button onClick={() => setActiveModal("export")} className="flex items-center gap-1 px-1.5 py-0.5 bg-[#333333] hover:bg-[#444444] text-[#eeeeee] rounded-[2px] transition-none text-[11px]">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button onClick={() => setActiveModal("publish")} className="flex items-center gap-1 px-1.5 py-0.5 bg-[#059669] hover:bg-[#047857] text-white rounded-[2px] transition-none text-[11px] font-medium">
            Publish
          </button>
        </div>
      </div>

      {/* TRANSPORT */}
      <header className="h-11 bg-[#252526] border-b border-[#3e3e42] flex items-center justify-between px-3 shrink-0 z-10">
        <div className="flex items-center gap-3 w-1/4">
          <Link to="/dashboard?tab=projects" className="text-[#888888] hover:text-[#eeeeee] transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <input
            type="text"
            value={project.name}
            onChange={(e) => rename(e.target.value)}
            onBlur={save}
            className="bg-transparent text-[#eeeeee] font-medium text-[12px] focus:outline-none w-40 truncate"
          />
          <div className="w-px h-5 bg-[#3e3e42] mx-1" />
          <div className="flex bg-[#1e1e1e] border border-[#3e3e42] rounded-[2px] overflow-hidden">
            <button onClick={() => setTool("select")} className={`p-1 ${tool === "select" ? "bg-[#444444] text-white" : "text-[#888888] hover:bg-[#333333] hover:text-white"}`} title="Select tool (V)">
              <Menu className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setTool("cut")} className={`p-1 ${tool === "cut" ? "bg-[#444444] text-white" : "text-[#888888] hover:bg-[#333333] hover:text-white"}`} title="Cut tool (C)">
              <Scissors className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 w-2/4">
          <div className="flex items-center gap-0.5">
            <button onClick={() => seek(0)} className="w-8 h-7 bg-[#333333] hover:bg-[#444444] rounded-[2px] flex items-center justify-center transition-none border border-[#1e1e1e]">
              <SkipBack className="w-4 h-4" />
            </button>
            <button onClick={() => (isPlaying ? pause() : play())} className={`w-10 h-7 ${isPlaying ? "bg-[#059669] text-white" : "bg-[#333333] text-[#cccccc] hover:bg-[#444444]"} rounded-[2px] flex items-center justify-center transition-none border border-[#1e1e1e]`}>
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button onClick={() => stop()} className="w-8 h-7 bg-[#333333] hover:bg-[#444444] rounded-[2px] flex items-center justify-center transition-none border border-[#1e1e1e]" title="Stop">
              <Circle className="w-3 h-3 text-[#e11d48] fill-current" />
            </button>
            <button onClick={() => seek(audioEngine.lengthInBeats)} className="w-8 h-7 bg-[#333333] hover:bg-[#444444] rounded-[2px] flex items-center justify-center transition-none border border-[#1e1e1e]">
              <SkipForward className="w-4 h-4" />
            </button>
            <button onClick={() => setLoop(!loopOn)} className={`w-8 h-7 rounded-[2px] flex items-center justify-center transition-none border border-[#1e1e1e] ${loopOn ? "bg-[#0ea5e9]/20 text-[#0ea5e9]" : "bg-[#333333] hover:bg-[#444444] text-[#888]"}`} title="Loop">
              <Repeat className="w-4 h-4" />
            </button>
          </div>
          <LcdDisplay />
        </div>

        <div className="w-1/4 flex justify-end">
          <div className="text-[10px] text-[#666666] bg-[#1e1e1e] border border-[#3e3e42] px-2 py-0.5 rounded-[2px]">
            {tracks.length} tracks
          </div>
        </div>
      </header>

      {/* ARRANGER */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track headers */}
        <Resizable
          defaultSize={{ width: 240, height: "100%" }}
          minWidth={180}
          maxWidth={350}
          enable={{ right: true }}
          className="bg-[#252526] border-r border-[#3e3e42] flex flex-col shrink-0 z-10 relative"
          handleClasses={{ right: "w-1 hover:bg-[#0ea5e9] transition-colors cursor-col-resize z-20 right-0 top-0 bottom-0 absolute" }}
        >
          <div className="h-6 border-b border-[#3e3e42] flex items-center justify-between px-2 bg-[#1e1e1e]">
            <button onClick={() => addTrack("audio")} className="flex items-center gap-1.5 text-[11px] text-[#888888] hover:text-white transition-colors w-full">
              <Plus className="w-3 h-3" />
              <span>Add Track</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            {tracks.map((track) => (
              <div
                key={track.id}
                onClick={() => selectTrack(track.id)}
                className={`h-[64px] border-b border-[#3e3e42] flex flex-col justify-between p-1 relative transition-none cursor-pointer ${track.id === selectedTrackId ? "bg-[#37373d]" : "bg-[#252526] hover:bg-[#2a2a2d]"}`}
              >
                {track.id === selectedTrackId && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#0ea5e9]" />}
                <div className="flex items-center justify-between ml-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="text-[#888888]">{trackIcon(track.type)}</div>
                    <span className="text-[11px] font-medium text-[#eeeeee] truncate w-24">{track.name}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); removeTrack(track.id); }} className="text-[#666666] hover:text-[#e11d48]" title="Delete track">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center justify-between ml-1.5 mt-1 gap-2">
                  <div className="flex gap-[1px]">
                    <button onClick={(e) => { e.stopPropagation(); toggleMute(track.id); }} className={`w-4 h-4 rounded-[1px] flex items-center justify-center text-[9px] font-bold transition-none ${track.muted ? "bg-[#d97706] text-white" : "bg-[#333333] text-[#888888] hover:bg-[#444444]"}`}>M</button>
                    <button onClick={(e) => { e.stopPropagation(); toggleSolo(track.id); }} className={`w-4 h-4 rounded-[1px] flex items-center justify-center text-[9px] font-bold transition-none ${track.solo ? "bg-[#059669] text-white" : "bg-[#333333] text-[#888888] hover:bg-[#444444]"}`}>S</button>
                    <button onClick={(e) => { e.stopPropagation(); toggleArm(track.id); }} className={`w-4 h-4 rounded-[1px] flex items-center justify-center text-[9px] font-bold transition-none ${track.armed ? "bg-[#e11d48] text-white" : "bg-[#333333] text-[#888888] hover:bg-[#444444]"}`}>R</button>
                  </div>
                  <div className="flex-1 flex items-center gap-1.5 pr-1">
                    <input
                      type="range" min={0} max={100} value={track.volume}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateTrack(track.id, { volume: Number(e.target.value) })}
                      className="flex-1 h-1.5 accent-[#0ea5e9] cursor-pointer"
                    />
                    <div className="text-[9px] text-[#888888] font-mono w-4 text-center">{track.pan === 0 ? "C" : track.pan > 0 ? "R" : "L"}</div>
                  </div>
                </div>
              </div>
            ))}
            {tracks.length === 0 && (
              <div className="p-4 text-center text-[#666666] text-[11px]">No tracks. Click "Add Track" or drag a sample from the Browser.</div>
            )}
          </div>
        </Resizable>

        {/* Timeline & clips */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#1e1e1e]">
          <div className="h-6 border-b border-[#3e3e42] bg-[#252526] flex items-center px-2 justify-between sticky top-0 z-10">
            <span className="text-[10px] text-[#666666]">{tool === "cut" ? "Cut tool: click a clip to split" : "Drag clips to move · edges to resize"}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#888888]">Zoom:</span>
              <input
                type="range"
                min={16}
                max={64}
                value={pxPerBeat}
                onChange={(e) => setPxPerBeat(Number(e.target.value))}
                className="w-16 accent-[#0ea5e9]"
              />
              <span className="text-[10px] text-[#888888]">Grid:</span>
              <select value={grid} onChange={(e) => setGrid(e.target.value)} className="bg-[#1e1e1e] border border-[#3e3e42] rounded-[2px] text-[10px] text-[#cccccc] outline-none px-1 py-0.5">
                {Object.keys(GRID_OPTIONS).map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div ref={lanesRef} className="flex-1 overflow-auto relative">
            {/* ruler */}
            <div
              className="h-5 border-b border-[#3e3e42] bg-[#2d2d2d] flex items-end sticky top-0 z-10 text-[#888888] text-[9px] font-mono cursor-pointer"
              style={{ width: `${BARS * 4 * pxPerBeat}px` }}
              onClick={(e) => seek(snap(beatFromClientX(e.clientX), 1))}
            >
              {Array.from({ length: BARS }).map((_, i) => (
                <div key={i} className="flex-none border-l border-[#444444] h-full flex flex-col justify-between" style={{ width: `${4 * pxPerBeat}px` }}>
                  <span className="pl-1 leading-none pt-[1px]">{i + 1}</span>
                </div>
              ))}
            </div>

            <div className="relative" style={{ width: `${BARS * 4 * pxPerBeat}px` }}>
              <Playhead pxPerBeat={pxPerBeat} />
              {Object.entries(remoteCursors).map(([userId, cursor]) => {
                if (userId === user.id) return null;
                const trackIndex = tracks.findIndex((t) => t.id === cursor.trackId);
                const laneTop = 20 + (trackIndex >= 0 ? trackIndex * 64 : 0);
                return (
                  <div
                    key={userId}
                    className="absolute z-30 pointer-events-none"
                    style={{ left: `${cursor.beat * pxPerBeat}px`, top: `${laneTop}px` }}
                  >
                    <div className="w-px h-14 bg-amber-400/90" />
                    <span className="block mt-0.5 text-[8px] font-medium bg-amber-400 text-black px-1 rounded whitespace-nowrap max-w-[72px] truncate">
                      {cursor.username}
                    </span>
                  </div>
                );
              })}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: "linear-gradient(90deg, #2a2a2b 1px, transparent 1px), linear-gradient(90deg, rgba(60,60,62,0.4) 1px, transparent 1px)",
                  backgroundSize: `${4 * pxPerBeat}px 100%, ${pxPerBeat}px 100%`,
                }}
              />
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className={`h-[64px] border-b border-[#3e3e42] relative ${track.id === selectedTrackId ? "bg-white/[0.03]" : ""}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onLaneDrop(e, track.id)}
                  onDoubleClick={(e) => {
                    if (readOnly) return;
                    if (track.type === "synth" || track.type === "drum") {
                      const beat = snap(beatFromClientX(e.clientX), GRID_OPTIONS[grid] || 1);
                      addMidiClip(track.id, beat, 4);
                      setBottomPanelTab("midi");
                    }
                  }}
                >
                  {track.clips.map((clip) => (
                    <div
                      key={clip.id}
                      onPointerDown={(e) => onClipPointerDown(e, track, clip, "move")}
                      className={`absolute top-1 bottom-1 rounded-[2px] overflow-hidden border group hover:brightness-110 transition-none ${tool === "cut" ? "cursor-text" : "cursor-grab"} ${clip.id === selectedClipId ? "ring-1 ring-white" : ""}`}
                      style={{
                        left: `${clip.start * pxPerBeat}px`,
                        width: `${clip.duration * pxPerBeat}px`,
                        backgroundColor: `${track.color}40`,
                        borderColor: track.color,
                      }}
                    >
                      <div className="h-3.5 bg-black/50 flex items-center px-1.5 text-[9px] text-[#eeeeee] font-medium truncate">{clip.name}</div>
                      <div className="absolute top-3.5 bottom-0 left-0 right-0 p-0.5">
                        <ClipContent
                          clip={clip}
                          color={track.color}
                          width={clip.duration * pxPerBeat}
                          hqPreview={hqPreview}
                        />
                      </div>
                      <div onPointerDown={(e) => onClipPointerDown(e, track, clip, "left")} className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-white/30 opacity-0 group-hover:opacity-100" />
                      <div onPointerDown={(e) => onClipPointerDown(e, track, clip, "right")} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-white/30 opacity-0 group-hover:opacity-100" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Browser */}
        {showRightPanel && (
          <Resizable
            defaultSize={{ width: 240, height: "100%" }}
            minWidth={180}
            maxWidth={400}
            enable={{ left: true }}
            className="bg-[#252526] border-l border-[#3e3e42] flex flex-col shrink-0 z-10 relative"
            handleClasses={{ left: "w-1 hover:bg-[#0ea5e9] transition-colors cursor-col-resize z-20 left-0 top-0 bottom-0 absolute" }}
          >
            <div className="h-6 border-b border-[#3e3e42] flex items-center justify-between px-2 bg-[#1e1e1e]">
              <span className="text-[11px] font-medium text-[#cccccc] flex items-center gap-1.5">
                <ListMusic className="w-3.5 h-3.5" />
                Browser
              </span>
              <button onClick={() => setShowRightPanel(false)} className="text-[#888888] hover:text-white">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-2 border-b border-[#3e3e42]">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-[#888888]" />
                <input
                  type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search samples..."
                  className="w-full bg-[#1e1e1e] text-[11px] text-[#cccccc] rounded-[2px] pl-6 pr-2 py-1 border border-[#3e3e42] focus:outline-none focus:border-[#0ea5e9]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-1 space-y-[1px]">
              {filteredAssets.length > 0 && (
                <div className="px-1 py-1 text-[9px] uppercase tracking-wider text-[#666666]">My Uploads</div>
              )}
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("application/x-musiclab", JSON.stringify({ kind: "asset", id: asset.id, name: asset.name, durationBeats: Math.max(1, Math.round(asset.duration * (project.state.bpm / 60))) }))}
                  className="flex items-center gap-2 p-1 rounded-[2px] hover:bg-[#333333] group cursor-grab border border-transparent hover:border-[#444444]"
                >
                  <button onClick={() => audioEngine.previewAsset(asset.id).catch(async () => audioEngine.previewAsset(asset.id, await assetService.getBlob(asset.id)))} className="w-5 h-5 rounded-[2px] bg-[#1e1e1e] border border-[#3e3e42] flex items-center justify-center text-[#888888] group-hover:text-white shrink-0">
                    <Play className="w-2.5 h-2.5 ml-0.5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-[#eeeeee] truncate leading-tight">{asset.name}</div>
                    <div className="text-[9px] text-[#888888]">{asset.format}</div>
                  </div>
                </div>
              ))}

              <div className="px-1 py-1 text-[9px] uppercase tracking-wider text-[#666666]">Samples</div>
              {filteredSamples.map((sample) => (
                <div
                  key={sample.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("application/x-musiclab", JSON.stringify({ kind: "sample", id: sample.id }))}
                  className="flex items-center gap-2 p-1 rounded-[2px] hover:bg-[#333333] group cursor-grab border border-transparent hover:border-[#444444]"
                >
                  <button onClick={() => audioEngine.previewSample(sample.id)} className="w-5 h-5 rounded-[2px] bg-[#1e1e1e] border border-[#3e3e42] flex items-center justify-center text-[#888888] group-hover:text-white hover:bg-[#0ea5e9]/20 shrink-0">
                    <Play className="w-2.5 h-2.5 ml-0.5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-[#eeeeee] truncate leading-tight">{sample.name}</div>
                    <div className="text-[9px] text-[#888888] flex gap-1.5 mt-0.5">
                      {sample.bpm && <span>{sample.bpm} BPM</span>}
                      <span>{sample.key}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Resizable>
        )}
      </div>

      {/* BOTTOM PANEL */}
      <Resizable
        defaultSize={{ width: "100%", height: 220 }}
        minHeight={150}
        maxHeight={500}
        enable={{ top: true }}
        className="bg-[#252526] border-t border-[#3e3e42] flex flex-col shrink-0 z-20 relative"
        handleClasses={{ top: "h-1 hover:bg-[#0ea5e9] transition-colors cursor-row-resize z-30 top-0 left-0 right-0 absolute" }}
      >
        <div className="h-7 border-b border-[#3e3e42] flex items-center px-2 bg-[#1e1e1e] gap-1">
          {(["mixer", "effects", "midi"] as const).map((tab) => (
            <button key={tab} onClick={() => setBottomPanelTab(tab)} className={`px-3 py-1 text-[11px] font-medium capitalize border-t-2 transition-none ${bottomPanelTab === tab ? "text-[#eeeeee] border-[#0ea5e9] bg-[#252526]" : "text-[#888888] border-transparent hover:text-white hover:bg-[#252526]"}`}>
              {tab}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            {!showRightPanel && (
              <button onClick={() => setShowRightPanel(true)} className="flex items-center gap-1.5 text-[10px] text-[#888888] hover:text-white">
                <ListMusic className="w-3 h-3" />
                Browser
              </button>
            )}
            <button className="p-1 text-[#888888] hover:text-white rounded-[2px] hover:bg-[#333333]">
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-[#1e1e1e] flex overflow-hidden">
          {bottomPanelTab === "mixer" && (
            <div className="flex h-full w-full overflow-x-auto p-2 gap-1 bg-[#1e1e1e]">
              {tracks.map((track) => (
                <div key={track.id} className="w-[72px] bg-[#252526] border border-[#3e3e42] rounded-[2px] flex flex-col items-center py-1.5 shrink-0">
                  <input type="range" min={-50} max={50} value={track.pan} onChange={(e) => updateTrack(track.id, { pan: Number(e.target.value) })} className="w-12 accent-[#0ea5e9] mb-1.5 cursor-pointer" title="Pan" />
                  <div className="flex gap-[1px] mb-2 w-full px-2 justify-center">
                    <button onClick={() => toggleMute(track.id)} className={`w-4 h-4 rounded-[1px] text-[8px] font-bold ${track.muted ? "bg-[#d97706] text-white" : "bg-[#333333] text-[#888888]"}`}>M</button>
                    <button onClick={() => toggleSolo(track.id)} className={`w-4 h-4 rounded-[1px] text-[8px] font-bold ${track.solo ? "bg-[#059669] text-white" : "bg-[#333333] text-[#888888]"}`}>S</button>
                  </div>
                  <div className="w-full px-1.5 space-y-[1px] mb-2">
                    <button onClick={() => updateTrack(track.id, { eq: !track.eq })} className={`h-3.5 w-full border rounded-[1px] text-[8px] flex items-center px-1 truncate ${track.eq ? "bg-[#0ea5e9]/20 border-[#0ea5e9] text-[#0ea5e9]" : "bg-[#1e1e1e] border-[#333] text-[#888]"}`}>EQ</button>
                    <button onClick={() => updateTrack(track.id, { reverb: track.reverb > 0 ? 0 : 35 })} className={`h-3.5 w-full border rounded-[1px] text-[8px] flex items-center px-1 truncate ${track.reverb > 0 ? "bg-[#0ea5e9]/20 border-[#0ea5e9] text-[#0ea5e9]" : "bg-[#1e1e1e] border-[#333] text-[#888]"}`}>Reverb</button>
                    <button onClick={() => updateTrack(track.id, { delay: (track.delay ?? 0) > 0 ? 0 : 35 })} className={`h-3.5 w-full border rounded-[1px] text-[8px] flex items-center px-1 truncate ${(track.delay ?? 0) > 0 ? "bg-[#8b5cf6]/20 border-[#8b5cf6] text-[#c4b5fd]" : "bg-[#1e1e1e] border-[#333] text-[#888]"}`}>Delay</button>
                  </div>
                  <div className="flex-1 flex gap-1 w-full px-3 relative">
                    <Fader value={track.volume} onChange={(v) => updateTrack(track.id, { volume: v })} />
                    <Meter trackId={track.id} className="w-1.5" />
                  </div>
                  <div className="text-[9px] text-[#0ea5e9] font-mono mt-1 mb-0.5">{track.volume}</div>
                  <div className="text-[9px] truncate w-full text-center text-[#cccccc] px-1 bg-[#1e1e1e] py-0.5">{track.name}</div>
                </div>
              ))}

              <div className="w-4 flex items-center justify-center"><div className="h-full w-px bg-[#3e3e42]" /></div>
              <div className="w-[80px] bg-[#2d2d2d] border border-[#3e3e42] rounded-[2px] flex flex-col items-center py-1.5 shrink-0">
                <div className="text-[10px] text-[#eeeeee] font-medium mb-2 mt-1">MASTER</div>
                <div className="flex-1 flex gap-1 w-full px-4 relative">
                  <Fader value={project.state.masterVolume} onChange={setMasterVolume} color="#0ea5e9" />
                  <Meter master className="w-2" />
                </div>
                <div className="text-[9px] text-[#0ea5e9] font-mono mt-1 mb-0.5">{project.state.masterVolume}</div>
              </div>
            </div>
          )}

          {bottomPanelTab === "effects" && (
            <div className="p-4 text-[12px] text-[#cccccc] w-full">
              {selectedTrack ? (
                <div className="max-w-md space-y-4">
                  <h3 className="text-[#eeeeee] font-medium">FX Chain — {selectedTrack.name}</h3>
                  <div className="flex items-center justify-between bg-[#252526] border border-[#3e3e42] rounded-lg px-4 py-3">
                    <span>EQ (Peaking +4dB @ 1.2kHz)</span>
                    <button onClick={() => updateTrack(selectedTrack.id, { eq: !selectedTrack.eq })} className={`w-10 h-6 rounded-full relative border ${selectedTrack.eq ? "bg-[#0ea5e9]/20 border-[#0ea5e9]" : "bg-[#1e1e1e] border-[#3e3e42]"}`}>
                      <div className={`absolute top-[3px] left-[3px] bg-[#eeeeee] w-4 h-4 rounded-full transition-transform ${selectedTrack.eq ? "translate-x-4" : ""}`} />
                    </button>
                  </div>
                  <div className="bg-[#252526] border border-[#3e3e42] rounded-lg px-4 py-3">
                    <div className="flex justify-between mb-2"><span>Reverb (wet)</span><span className="font-mono text-[#0ea5e9]">{selectedTrack.reverb}%</span></div>
                    <input type="range" min={0} max={100} value={selectedTrack.reverb} onChange={(e) => updateTrack(selectedTrack.id, { reverb: Number(e.target.value) })} className="w-full accent-[#0ea5e9]" />
                  </div>
                  <div className="bg-[#252526] border border-[#3e3e42] rounded-lg px-4 py-3">
                    <div className="flex justify-between mb-2"><span>Delay (wet)</span><span className="font-mono text-[#8b5cf6]">{selectedTrack.delay ?? 0}%</span></div>
                    <input type="range" min={0} max={100} value={selectedTrack.delay ?? 0} onChange={(e) => updateTrack(selectedTrack.id, { delay: Number(e.target.value) })} className="w-full accent-[#8b5cf6]" />
                    <p className="text-[10px] text-[#666] mt-2">Tape-style feedback delay (~dotted 8th).</p>
                  </div>
                </div>
              ) : (
                <p className="text-[#666666]">Select a track to edit its effects chain.</p>
              )}
            </div>
          )}

          {bottomPanelTab === "midi" && (
            <div className="w-full h-full flex flex-col">
              {selectedClip && selectedClip.type === "midi" && selectedTrack ? (
                <>
                  <div className="px-3 py-1 border-b border-[#3e3e42] text-[10px] text-[#888] flex items-center justify-between gap-2">
                    <span>Piano Roll — {selectedClip.name}</span>
                    <div className="flex items-center gap-2">
                      <span>{(selectedClip.notes ?? []).length} notes</span>
                      {!readOnly && (
                        <>
                          <input
                            ref={midiImportRef}
                            type="file"
                            accept=".mid,.midi,audio/midi"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                await importMidiToClip(selectedTrack.id, selectedClip.id, file);
                                toast.success(`Imported ${file.name}`);
                              } catch {
                                toast.error("MIDI import failed");
                              }
                              e.target.value = "";
                            }}
                          />
                          <button
                            onClick={() => midiImportRef.current?.click()}
                            className="flex items-center gap-1 px-2 py-0.5 bg-[#333] hover:bg-[#444] rounded text-[#ccc]"
                            title="Import .mid into this clip"
                          >
                            <Upload className="w-3 h-3" />
                            Import
                          </button>
                          <button
                            onClick={() => {
                              const bytes = exportClipToMidi(selectedClip, project.state.bpm, selectedClip.name);
                              downloadMidiBytes(bytes, `${selectedClip.name}.mid`);
                              toast.success("MIDI clip exported");
                            }}
                            className="px-2 py-0.5 bg-[#333] hover:bg-[#444] rounded text-[#ccc]"
                          >
                            Export clip
                          </button>
                          <button
                            onClick={() => {
                              const bytes = exportProjectMidi(project.state, project.name);
                              downloadMidiBytes(bytes, `${project.name}.mid`);
                              toast.success("Project MIDI exported");
                            }}
                            className="px-2 py-0.5 bg-[#333] hover:bg-[#444] rounded text-[#ccc]"
                          >
                            Export all
                          </button>
                          <div className="flex items-center gap-1">
                            <Grid3x3 className="w-3 h-3 text-[#666]" />
                            <select
                              value={quantizeGrid}
                              onChange={(e) => setQuantizeGrid(Number(e.target.value) as QuantizeGrid)}
                              className="bg-[#1e1e1e] border border-[#3e3e42] rounded px-1 text-[#ccc]"
                            >
                              {QUANTIZE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                quantizeMidiClip(selectedTrack.id, selectedClip.id, quantizeGrid);
                                toast.success(`Quantized to ${quantizeGrid} beats`);
                              }}
                              className="px-2 py-0.5 bg-[#0ea5e9]/20 hover:bg-[#0ea5e9]/30 text-[#0ea5e9] rounded"
                            >
                              Quantize
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-h-0">
                    <PianoRoll
                      clip={selectedClip}
                      trackColor={selectedTrack.color}
                      bpm={project.state.bpm}
                      readOnly={readOnly}
                      gridDivision={quantizeGrid}
                      onChange={(notes) => setClipNotes(selectedTrack.id, selectedClip.id, notes)}
                    />
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#555555] flex-col gap-2">
                  <Music className="w-6 h-6" />
                  <p className="text-[11px] text-center px-4">
                    Select a MIDI clip, or double-click a Synth/Drum track lane to create one
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </Resizable>

      {/* MODALS */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center" onClick={() => setActiveModal(null)}>
          <div className="bg-[#252526] border border-[#3e3e42] rounded-[4px] shadow-2xl w-full max-w-sm overflow-hidden text-[12px] text-[#cccccc]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#3e3e42] bg-[#1e1e1e]">
              <h3 className="text-white font-medium">
                {activeModal === "settings" ? "Project Settings" : activeModal === "export" ? "Export Audio" : "Publish to MusicLab"}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-[#888888] hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4">
              {activeModal === "export" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-[#888888] block mb-1">Render mode</label>
                    <select
                      value={exportMode}
                      onChange={(e) => setExportMode(e.target.value as "local" | "server")}
                      className="w-full bg-[#1e1e1e] border border-[#3e3e42] rounded-[2px] px-2 py-1.5 text-[#eeeeee] focus:outline-none focus:border-[#0ea5e9]"
                    >
                      <option value="local">Local (browser — instant)</option>
                      {renderService.isAvailable() && (
                        <option value="server">Server (Redis + BullMQ worker)</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-[#888888] block mb-1">Format</label>
                    <select className="w-full bg-[#1e1e1e] border border-[#3e3e42] rounded-[2px] px-2 py-1.5 text-[#eeeeee] focus:outline-none focus:border-[#0ea5e9]">
                      <option>WAV (Lossless 44.1 kHz)</option>
                    </select>
                  </div>
                  <p className="text-[11px] text-[#888888]">
                    {exportMode === "server"
                      ? "Mixdown runs on the backend worker — useful for long projects without blocking the browser."
                      : "The arrangement is rendered offline in your browser and downloaded as WAV."}
                  </p>
                  {exporting && exportMode === "server" && renderProgress > 0 && (
                    <div className="w-full bg-[#1e1e1e] rounded h-1.5 overflow-hidden">
                      <div className="h-full bg-[#0ea5e9] transition-all" style={{ width: `${renderProgress}%` }} />
                    </div>
                  )}
                  <button onClick={handleExport} disabled={exporting} className="w-full py-1.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-medium rounded-[2px] transition-none mt-2 disabled:opacity-60">
                    {exporting ? (exportMode === "server" ? `Rendering… ${renderProgress}%` : "Rendering…") : "Start Export"}
                  </button>
                </div>
              )}
              {activeModal === "publish" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-[#888888] block mb-1">Track Title</label>
                    <input type="text" value={project.name} onChange={(e) => rename(e.target.value)} className="w-full bg-[#1e1e1e] border border-[#3e3e42] rounded-[2px] px-2 py-1.5 text-[#eeeeee] focus:outline-none focus:border-[#0ea5e9]" />
                  </div>
                  <p className="text-[11px] text-[#888888]">Publishing makes this project public on your feed.</p>
                  <button onClick={handlePublish} className="w-full py-1.5 bg-[#059669] hover:bg-[#047857] text-white font-medium rounded-[2px] transition-none mt-2">Publish to Feed</button>
                </div>
              )}
              {activeModal === "settings" && (
                <div className="space-y-3 text-[11px]">
                  <div className="flex justify-between items-center text-[#cccccc]">
                    <span>Tempo (BPM)</span>
                    <input type="number" value={project.state.bpm} onChange={(e) => useEditorStore.getState().setBpm(Number(e.target.value))} className="w-16 bg-[#1e1e1e] border border-[#3e3e42] rounded px-2 py-1 text-[#eeeeee] focus:outline-none" />
                  </div>
                  <div className="flex justify-between items-center text-[#cccccc]">
                    <span>Master Volume</span>
                    <input type="range" min={0} max={100} value={project.state.masterVolume} onChange={(e) => setMasterVolume(Number(e.target.value))} className="accent-[#0ea5e9]" />
                  </div>
                  <p className="text-[#666666]">Grid snap and tools are available from the toolbar above.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
