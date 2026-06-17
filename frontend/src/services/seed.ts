import { getDB } from "../lib/db";
import { uid } from "../lib/id";
import type { AdminLog, AdminReport, Project, Track, User } from "../types";
import { makeTrack } from "./projects";

const SEED_FLAG = "musiclab.seeded.v2";

function clip(sampleId: string, start: number, duration: number, type: "audio" | "midi", name: string) {
  return { id: uid("c_"), sampleId, name, start, duration, type, offset: 0 };
}

function demoTracks(): Track[] {
  const drums = makeTrack({ name: "808 Drum Kit", type: "drum", color: "#ef4444", volume: 85 });
  drums.clips = [
    clip("kick-808", 0, 1, "midi", "Kick"),
    clip("kick-808", 2, 1, "midi", "Kick"),
    clip("kick-808", 4, 1, "midi", "Kick"),
    clip("kick-808", 6, 1, "midi", "Kick"),
    clip("snare-heavy", 1, 1, "midi", "Snare"),
    clip("snare-heavy", 3, 1, "midi", "Snare"),
    clip("snare-heavy", 5, 1, "midi", "Snare"),
    clip("snare-heavy", 7, 1, "midi", "Snare"),
  ];
  const bass = makeTrack({ name: "Deep Bass", type: "synth", color: "#3b82f6", volume: 90 });
  bass.clips = [clip("bass-loop-am", 0, 4, "midi", "Bassline"), clip("bass-loop-am", 4, 4, "midi", "Bassline")];
  const lead = makeTrack({ name: "Lead Synth", type: "synth", color: "#fbbf24", volume: 70, pan: -10 });
  lead.clips = [clip("lead-arp", 4, 4, "midi", "Arp")];
  const pad = makeTrack({ name: "Warm Pad", type: "synth", color: "#10b981", volume: 60, pan: 10 });
  pad.reverb = 35;
  pad.clips = [clip("pad-fmaj", 0, 4, "audio", "Pad"), clip("pad-fmaj", 4, 4, "audio", "Pad")];
  return [drums, bass, lead, pad];
}

export async function seedIfNeeded(): Promise<void> {
  if (localStorage.getItem(SEED_FLAG)) return;
  const db = await getDB();

  const existing = await db.getAll("users");
  if (existing.length === 0) {
    const now = new Date().toISOString();
    const creator: User = {
      id: "u_creator_demo",
      username: "creator",
      email: "creator@musiclab.com",
      role: "creator",
      bio: "Music producer & beatmaker based in Tokyo.",
      status: "Active",
      createdAt: now,
    };
    const admin: User = {
      id: "u_admin_demo",
      username: "admin",
      email: "admin@musiclab.com",
      role: "admin",
      bio: "MusicLab system administrator.",
      status: "Active",
      createdAt: now,
    };
    const others: User[] = [
      { id: uid("u_"), username: "djmaster", email: "dj@example.com", role: "creator", status: "Active", createdAt: now },
      { id: uid("u_"), username: "producer_pro", email: "producer@example.com", role: "creator", status: "Active", createdAt: now },
      { id: uid("u_"), username: "spammer123", email: "spam@example.com", role: "creator", status: "Banned", createdAt: now },
      { id: uid("u_"), username: "beatmaker", email: "beats@example.com", role: "creator", status: "Active", createdAt: now },
      { id: uid("u_"), username: "synthwave_fan", email: "synth@example.com", role: "creator", status: "Active", createdAt: now },
      { id: uid("u_"), username: "rockstar_88", email: "rock@example.com", role: "creator", status: "Active", createdAt: now },
    ];
    for (const u of [creator, admin, ...others]) await db.put("users", u);

    // Demo projects for the creator.
    const tNow = Date.now();
    const projects: Project[] = [
      {
        id: "p_summer_demo",
        ownerId: creator.id,
        name: "Summer Vibes",
        coverColor: "#ef4444",
        status: "Public",
        createdAt: now,
        updatedAt: new Date(tNow - 1000 * 60 * 60 * 2).toISOString(),
        state: { bpm: 120, timeSig: [4, 4], masterVolume: 90, tracks: demoTracks() },
      },
      {
        id: uid("p_"),
        ownerId: creator.id,
        name: "Night Drive",
        coverColor: "#3b82f6",
        status: "Private",
        createdAt: now,
        updatedAt: new Date(tNow - 1000 * 60 * 60 * 26).toISOString(),
        state: { bpm: 128, timeSig: [4, 4], masterVolume: 88, tracks: demoTracks().slice(0, 3) },
      },
      {
        id: uid("p_"),
        ownerId: creator.id,
        name: "Jazz Session",
        coverColor: "#fbbf24",
        status: "Private",
        createdAt: now,
        updatedAt: new Date(tNow - 1000 * 60 * 60 * 72).toISOString(),
        state: { bpm: 95, timeSig: [4, 4], masterVolume: 85, tracks: demoTracks().slice(1, 4) },
      },
    ];
    for (const p of projects) await db.put("projects", p);

    const reports: AdminReport[] = [
      { id: uid("r_"), category: "content", type: "Copyright Infringement", track: "Summer Vibes Remix", user: "djmaster", date: "2 hours ago" },
      { id: uid("r_"), category: "content", type: "Inappropriate Content", track: "Night Drive (Explicit)", user: "rockstar_88", date: "5 hours ago" },
      { id: uid("r_"), category: "account", type: "Spam Account", reason: "Posting repetitive links", user: "spammer123", date: "1 day ago" },
      { id: uid("r_"), category: "account", type: "Impersonation", reason: "Pretending to be another artist", user: "fake_producer", date: "2 days ago" },
    ];
    for (const r of reports) await db.put("reports", r);

    const logs: AdminLog[] = [
      { id: uid("log_"), action: "User 'spammer123' was banned", admin: "Admin_01", time: "10:30 AM" },
      { id: uid("log_"), action: "System backup completed", admin: "System", time: "03:00 AM" },
      { id: uid("log_"), action: "New account 'producer_pro' registered", admin: "System", time: "Yesterday" },
    ];
    for (const l of logs) await db.put("logs", l);
  }

  localStorage.setItem(SEED_FLAG, "1");
}
