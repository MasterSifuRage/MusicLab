import React, { useCallback, useRef } from "react";
import type { Clip, MidiNote } from "../../types";
import { uid } from "../../lib/id";
import type { QuantizeGrid } from "../../audio/quantize";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const ROW_H = 14;
const VEL_LANE_H = 52;
const DEFAULT_PX_PER_BEAT = 24;

function pitchLabel(pitch: number) {
  const octave = Math.floor(pitch / 12) - 1;
  return `${NOTE_NAMES[pitch % 12]}${octave}`;
}

interface PianoRollProps {
  clip: Clip;
  trackColor: string;
  bpm: number;
  readOnly?: boolean;
  pxPerBeat?: number;
  gridDivision?: QuantizeGrid;
  onChange: (notes: MidiNote[]) => void;
}

export function PianoRoll({
  clip,
  trackColor,
  readOnly = false,
  pxPerBeat = DEFAULT_PX_PER_BEAT,
  gridDivision = 0.25,
  onChange,
}: PianoRollProps) {
  const notes = clip.notes ?? [];
  const lowPitch = 48;
  const highPitch = 84;
  const pitches = Array.from({ length: highPitch - lowPitch + 1 }, (_, i) => highPitch - i);
  const gridRef = useRef<HTMLDivElement>(null);
  const velRef = useRef<HTMLDivElement>(null);

  const beatFromX = useCallback(
    (clientX: number, el: HTMLDivElement | null) => {
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      return Math.max(0, Math.min(clip.duration, (clientX - rect.left + el.scrollLeft) / pxPerBeat));
    },
    [clip.duration, pxPerBeat]
  );

  const pitchFromY = useCallback(
    (clientY: number) => {
      const el = gridRef.current;
      if (!el) return lowPitch;
      const rect = el.getBoundingClientRect();
      const row = Math.floor((clientY - rect.top + el.scrollTop) / ROW_H);
      return Math.max(lowPitch, Math.min(highPitch, highPitch - row));
    },
    [highPitch, lowPitch]
  );

  const snapBeat = (b: number) =>
    gridDivision > 0 ? Math.round(b / gridDivision) * gridDivision : b;

  const syncVelScroll = (scrollLeft: number) => {
    if (velRef.current) velRef.current.scrollLeft = scrollLeft;
  };

  const handleGridDoubleClick = (e: React.MouseEvent) => {
    if (readOnly) return;
    const beat = snapBeat(beatFromX(e.clientX, gridRef.current));
    const pitch = pitchFromY(e.clientY);
    const note: MidiNote = {
      id: uid("n_"),
      pitch,
      start: beat,
      duration: 1,
      velocity: 100,
    };
    onChange([...notes, note]);
  };

  const startNoteDrag = (
    e: React.PointerEvent,
    note: MidiNote,
    mode: "move" | "resize"
  ) => {
    if (readOnly) return;
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const orig = { ...note };

    const move = (ev: PointerEvent) => {
      const dBeat = (ev.clientX - startX) / pxPerBeat;
      const dPitch = Math.round((ev.clientY - startY) / ROW_H);
      if (mode === "move") {
        const next: MidiNote = {
          ...orig,
          start: Math.max(0, Math.min(clip.duration - orig.duration, snapBeat(orig.start + dBeat))),
          pitch: Math.max(lowPitch, Math.min(highPitch, orig.pitch - dPitch)),
        };
        onChange(notes.map((n) => (n.id === note.id ? next : n)));
      } else {
        const next: MidiNote = {
          ...orig,
          duration: Math.max(0.25, Math.min(clip.duration - orig.start, snapBeat(orig.duration + dBeat))),
        };
        onChange(notes.map((n) => (n.id === note.id ? next : n)));
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startVelocityDrag = (e: React.PointerEvent, note: MidiNote) => {
    if (readOnly) return;
    e.stopPropagation();
    const el = velRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    const apply = (clientY: number) => {
      const y = clientY - rect.top;
      const vel = Math.round(Math.max(1, Math.min(127, (1 - y / (VEL_LANE_H - 8)) * 127)));
      onChange(notes.map((n) => (n.id === note.id ? { ...n, velocity: vel } : n)));
    };

    apply(e.clientY);
    const move = (ev: PointerEvent) => apply(ev.clientY);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const deleteNote = (id: string) => {
    if (readOnly) return;
    onChange(notes.filter((n) => n.id !== id));
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#1a1a1a]">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Pitch labels */}
        <div className="w-10 shrink-0 border-r border-[#3e3e42] overflow-hidden bg-[#252526] flex flex-col">
          <div className="h-5 border-b border-[#3e3e42] shrink-0" />
          <div className="flex-1 overflow-hidden">
            {pitches.map((p) => (
              <div
                key={p}
                className={`h-[14px] text-[8px] font-mono flex items-center justify-end pr-1 ${p % 12 === 0 ? "text-[#888]" : "text-[#555]"}`}
              >
                {p % 12 === 0 ? pitchLabel(p) : ""}
              </div>
            ))}
          </div>
          <div
            className="shrink-0 border-t border-[#3e3e42] text-[8px] text-[#666] flex items-center justify-end pr-1"
            style={{ height: VEL_LANE_H }}
          >
            Vel
          </div>
        </div>

        {/* Note grid */}
        <div
          ref={gridRef}
          className="flex-1 overflow-auto relative"
          onDoubleClick={handleGridDoubleClick}
          onScroll={(e) => syncVelScroll(e.currentTarget.scrollLeft)}
        >
          <div
            className="h-5 border-b border-[#3e3e42] bg-[#2d2d2d] sticky top-0 z-10 flex text-[9px] font-mono text-[#666]"
            style={{ width: clip.duration * pxPerBeat }}
          >
            {Array.from({ length: Math.ceil(clip.duration) }).map((_, i) => (
              <div key={i} className="border-l border-[#444] pl-1" style={{ width: pxPerBeat }}>
                {i + 1}
              </div>
            ))}
          </div>

          <div className="relative" style={{ width: clip.duration * pxPerBeat, height: pitches.length * ROW_H }}>
            {pitches.map((p, i) => (
              <div
                key={p}
                className={`absolute left-0 right-0 border-b ${p % 12 === 0 ? "border-[#444]" : "border-[#2a2a2b]"}`}
                style={{ top: i * ROW_H, height: ROW_H }}
              />
            ))}
            {Array.from({ length: Math.ceil(clip.duration) + 1 }).map((_, i) => (
              <div
                key={`v${i}`}
                className="absolute top-0 bottom-0 border-l border-[#333] pointer-events-none"
                style={{ left: i * pxPerBeat }}
              />
            ))}

            {notes.map((note) => {
              const row = highPitch - note.pitch;
              const velAlpha = 0.45 + (note.velocity / 127) * 0.55;
              return (
                <div
                  key={note.id}
                  onPointerDown={(e) => startNoteDrag(e, note, "move")}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    deleteNote(note.id);
                  }}
                  className="absolute rounded-[2px] border cursor-grab hover:brightness-110"
                  style={{
                    left: note.start * pxPerBeat,
                    width: Math.max(4, note.duration * pxPerBeat - 1),
                    top: row * ROW_H + 1,
                    height: ROW_H - 2,
                    backgroundColor: `${trackColor}${Math.round(velAlpha * 255).toString(16).padStart(2, "0")}`,
                    borderColor: trackColor,
                  }}
                  title={`${pitchLabel(note.pitch)} · vel ${note.velocity}`}
                >
                  <div
                    onPointerDown={(e) => startNoteDrag(e, note, "resize")}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-white/30"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Velocity lane */}
      <div className="flex border-t border-[#3e3e42] shrink-0 bg-[#1e1e1e]">
        <div className="w-10 shrink-0 border-r border-[#3e3e42]" style={{ height: VEL_LANE_H }} />
        <div
          ref={velRef}
          className="flex-1 overflow-hidden relative"
          style={{ height: VEL_LANE_H }}
        >
          <div className="relative" style={{ width: clip.duration * pxPerBeat, height: VEL_LANE_H }}>
            <div className="absolute inset-0 pointer-events-none opacity-30">
              {[32, 64, 96].map((v) => (
                <div
                  key={v}
                  className="absolute left-0 right-0 border-t border-[#444]"
                  style={{ top: `${(1 - v / 127) * 100}%` }}
                />
              ))}
            </div>
            {notes.map((note) => {
              const barH = Math.max(4, (note.velocity / 127) * (VEL_LANE_H - 10));
              return (
                <div
                  key={`vel-${note.id}`}
                  onPointerDown={(e) => startVelocityDrag(e, note)}
                  className={`absolute bottom-1 rounded-[1px] ${readOnly ? "cursor-default" : "cursor-ns-resize hover:brightness-125"}`}
                  style={{
                    left: note.start * pxPerBeat + 1,
                    width: Math.max(4, note.duration * pxPerBeat - 2),
                    height: barH,
                    backgroundColor: trackColor,
                    opacity: 0.85,
                  }}
                  title={`Velocity ${note.velocity}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {!readOnly && (
        <p className="shrink-0 px-2 py-1 text-[10px] text-[#555] border-t border-[#3e3e42]">
          Double-click add note · drag velocity bars below · right-click delete
        </p>
      )}
    </div>
  );
}
