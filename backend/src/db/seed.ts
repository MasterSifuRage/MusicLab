import bcrypt from "bcryptjs";
import { pool, query } from "./pool.js";
import { uid } from "../lib/id.js";

async function seed() {
  const { rows } = await query(`SELECT COUNT(*)::int AS count FROM users`);
  if (rows[0].count > 0) {
    console.log("Database already seeded, skipping.");
    await pool.end();
    return;
  }

  const hash = await bcrypt.hash("demo1234", 10);
  const creatorId = "u_creator_demo";
  const adminId = "u_admin_demo";

  await query(
    `INSERT INTO users (id, username, email, password_hash, role, bio) VALUES
     ($1, 'creator', 'creator@musiclab.com', $3, 'creator', 'Music producer & beatmaker.'),
     ($2, 'admin', 'admin@musiclab.com', $3, 'admin', 'MusicLab administrator.')`,
    [creatorId, adminId, hash]
  );

  const demoUsers: [string, string, string][] = [
    ["djmaster", "dj@example.com", "Active"],
    ["producer_pro", "producer@example.com", "Active"],
    ["spammer123", "spam@example.com", "Banned"],
    ["beatmaker", "beats@example.com", "Active"],
    ["rockstar_88", "rock@example.com", "Active"],
  ];

  for (const [username, email, status] of demoUsers) {
    await query(
      `INSERT INTO users (id, username, email, password_hash, role, status) VALUES ($1, $2, $3, $4, 'creator', $5)`,
      [uid("u_"), username, email, hash, status]
    );
  }

  const state = {
    bpm: 120,
    timeSig: [4, 4],
    masterVolume: 90,
    tracks: [
      {
        id: "t_demo1",
        name: "808 Drum Kit",
        type: "drum",
        color: "#ef4444",
        volume: 85,
        pan: 0,
        muted: false,
        solo: false,
        armed: false,
        eq: false,
        reverb: 0,
        clips: [
          { id: "c1", sampleId: "kick-808", name: "Kick", start: 0, duration: 1, type: "midi", offset: 0 },
          { id: "c2", sampleId: "snare-heavy", name: "Snare", start: 1, duration: 1, type: "midi", offset: 0 },
        ],
      },
    ],
  };

  await query(
    `INSERT INTO projects (id, owner_id, name, cover_color, status, state) VALUES ($1, $2, 'Summer Vibes', '#ef4444', 'Public', $3)`,
    ["p_summer_demo", creatorId, JSON.stringify(state)]
  );

  await query(
    `INSERT INTO admin_reports (id, category, type, track, reason, reported_user) VALUES
     ($1, 'content', 'Copyright Infringement', 'Summer Vibes Remix', NULL, 'djmaster'),
     ($2, 'account', 'Spam Account', NULL, 'Posting repetitive links', 'spammer123')`,
    [uid("r_"), uid("r_")]
  );

  await query(
    `INSERT INTO admin_logs (id, action, admin) VALUES
     ($1, 'User spammer123 was banned', 'Admin_01'),
     ($2, 'System backup completed', 'System')`,
    [uid("log_"), uid("log_")]
  );

  console.log("Seed complete. Demo password for all accounts: demo1234");
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
