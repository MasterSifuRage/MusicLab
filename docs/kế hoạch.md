# MusicLab — Kế hoạch & Trạng thái xây dựng

> **Mục đích file này:** Tổng hợp nghiệp vụ, lộ trình, tính năng và **trạng thái hoàn thành** để không phải đọc lại toàn bộ codebase mỗi lần làm việc.  
> **Cập nhật lần cuối:** 2026-06-18 (hqPreview → waveform buckets, `lib/waveform.ts`)  
> **Tài liệu liên quan:** [`web MusicLab.md`](web%20MusicLab.md) · [`mô tả sơ bộ.md`](mô%20tả%20sơ%20bộ.md) · [`../README.md`](../README.md)

---

## 1. Tổng quan dự án

| Hạng mục | Nội dung |
|----------|----------|
| **Tên** | MusicLab — Web-DAW (Digital Audio Workstation) trên trình duyệt |
| **Mục tiêu** | Studio âm nhạc thu nhỏ: upload sample, sắp xếp timeline, mixer, cộng tác online |
| **Actor** | Guest · Creator · Admin |
| **Repo** | `frontend/` (React SPA) + `backend/` (Express API) + `nginx/` + `deploy/` |

### Ký hiệu trạng thái

| Ký hiệu | Ý nghĩa |
|---------|---------|
| ✅ | Hoàn thành — dùng được trong demo/production cơ bản |
| ⚠️ | Một phần — có nhưng còn thiếu hoặc chỉ hoạt động ở một chế độ |
| ❌ | Chưa làm / chưa có kế hoạch triển khai cụ thể |

---

## 2. Lộ trình phát triển (Phase)

| Phase | Phạm vi | Trạng thái | Ghi chú |
|-------|---------|------------|---------|
| **Phase 1** | Frontend SPA + Web Audio + IndexedDB (offline) | ✅ | Chạy `frontend` không cần backend |
| **Phase 2** | Backend Express + PostgreSQL + JWT + dual-mode API | ✅ | `VITE_API_URL` hoặc `VITE_USE_API` |
| **Phase 3** | Redis/BullMQ render, WebSocket collab, Piano Roll/MIDI, polish Editor | ⚠️ ~87% | Còn i18n editor, humanize, SMF Type 1, conflict OT |
| **Phase 4** | Production hardening (S3, HTTPS, tests đầy đủ) | ❌ | Xem mục 6 |

---

## 3. Kiến trúc & Stack (thực tế vs đặc tả)

| Thành phần | Đặc tả ban đầu | Thực tế triển khai | Trạng thái |
|------------|----------------|---------------------|------------|
| Frontend | React + Tailwind | React 18 + Vite 6 + Tailwind v4 + Zustand | ✅ |
| Audio Engine | Web Audio API + Wavesurfer.js + Tone.js | **Web Audio API thuần** + waveform SVG tùy chỉnh (`getClipPeaks`, `lib/waveform.ts`) | ⚠️ Không dùng Wavesurfer/Tone; timeline đủ dùng không cần Wavesurfer |
| Backend | Node.js + Express modular | Express + TypeScript, modules: auth/projects/assets/admin/render/collab | ✅ |
| Database | PostgreSQL + JSONB | `project_state`, `profile_meta`, assets, members, render_jobs | ✅ |
| Queue | Redis + BullMQ | BullMQ worker + fallback inline khi không có Redis | ✅ |
| Realtime | WebSocket | `/ws` — patch state, presence, cursor | ⚠️ |
| Deploy | Nginx | `docker-compose.prod.yml`, Vercel, Railway guide | ⚠️ Chưa có HTTPS Certbot template |
| CI | — | GitHub Actions build frontend + backend | ⚠️ Chưa có unit test |

---

## 4. Danh sách tính năng chi tiết

### 4.1. Trang công khai & Xác thực

| # | Tính năng | Trạng thái | Cách dùng | Ghi chú / File |
|---|-----------|------------|-----------|----------------|
| 1 | Landing page giới thiệu | ✅ | Vào `/` — nút Log In / Sign Up | `LandingPage.tsx` — i18n EN/VI |
| 2 | Đăng ký tài khoản Creator | ✅ | `/signup` — email, username, password | API: `POST /api/auth/signup` |
| 3 | Đăng nhập email/username | ✅ | `/login` — hoặc nút demo Creator/Admin | API: `POST /api/auth/login` |
| 4 | Đăng xuất | ✅ | Sidebar → **Log Out** hoặc menu avatar | Xóa JWT localStorage |
| 5 | Demo offline (IndexedDB) | ✅ | Login không cần backend — seed tự động | `authService.loginAs()` |
| 6 | Quên mật khẩu | ❌ | Link hiển thị nhưng chưa có flow | UI placeholder trên `/login` |
| 7 | i18n Landing + Login | ✅ | Settings → Ngôn ngữ EN/VI | `lib/i18n.ts` |
| 8 | i18n Sign Up | ❌ | `/signup` — toàn bộ tiếng Anh cứng | Chưa dùng `t()` |
| 9 | **Ngôn ngữ theo tài khoản** | ✅ | Settings → Interface Language | Lưu `localStorage` theo `userId` + `profile_meta.locale` (API) |

**Tài khoản demo (API mode):**

| Role | Email | Password |
|------|-------|----------|
| Creator | `creator@musiclab.com` | `demo1234` |
| Admin | `admin@musiclab.com` | `demo1234` |

---

### 4.2. Dashboard Creator

| # | Tính năng | Trạng thái | Cách dùng | Ghi chú |
|---|-----------|------------|-----------|---------|
| 1 | Sidebar: Home, Library, Projects, Settings | ✅ | `/dashboard` — tab qua URL `?tab=` | `dashboardNav.ts` |
| 2 | Tạo dự án mới | ✅ | Nút **Create Project** → mở Editor | `projectService.create()` |
| 3 | Danh sách dự án gần đây | ✅ | Tab **My Projects** | Xóa, đổi privacy |
| 4 | Cài đặt Creator | ✅ | Tab **Settings** — snap grid, auto-scroll, **HQ waveform**, ngôn ngữ | `SettingsPanel.tsx` — lưu qua **Save Changes** |
| 5 | Thông báo (mock) | ⚠️ | Icon chuông — dữ liệu giả | Chưa nối backend |
| 6 | i18n sidebar + settings | ✅ | EN/VI trong Settings + nav | Home/Projects vẫn một phần tiếng Anh |
| 7 | **Cài đặt theo tài khoản** | ❌ | Snap grid, privacy, … | `musiclab.settings` vẫn **chung** toàn máy (khác locale) |

---

### 4.3. Thư viện (Library)

| # | Tính năng | Trạng thái | Cách dùng | Ghi chú |
|---|-----------|------------|-----------|---------|
| 1 | Upload audio (.wav, .mp3, …) | ✅ | `/library` → **Upload Audio** | Multer backend, IndexedDB offline |
| 2 | Nghe thử (preview) | ✅ | Nút Play trên từng file | `AudioEngine.previewAsset()` |
| 3 | Xóa asset | ✅ | Nút Trash | API xóa cả file trên disk |
| 4 | Sample library tích hợp | ✅ | Kéo sample từ panel Editor hoặc xem trong Library | `audio/synth.ts` |
| 5 | Hiển thị quota 500 MB | ✅ | Thanh progress trên Library | |
| 6 | Enforce quota khi upload | ✅ | API trả 413 nếu vượt; offline cũng chặn | `assets/routes.ts` |
| 7 | Tính duration khi upload (API) | ✅ | Tự decode bằng `audio-decode` | |
| 8 | i18n Library | ⚠️ | Một số nhãn đã i18n | Chưa phủ hết UI |

---

### 4.4. Studio Editor — Timeline & Clip

| # | Tính năng | Trạng thái | Cách dùng | Ghi chú |
|---|-----------|------------|-----------|---------|
| 1 | Multi-track timeline | ✅ | `/editor/:projectId` | Drum / Synth / Audio track |
| 2 | Kéo thả sample/asset vào lane | ✅ | Kéo từ Browser panel → thả lên track | |
| 3 | Di chuyển clip | ✅ | Tool Select (V) — kéo clip | Snap theo grid nếu bật trong Settings |
| 4 | Resize clip (trim) | ✅ | Kéo mép trái/phải clip | |
| 5 | **Split clip (cắt)** | ✅ | Tool Cut (C) → click lên clip tại vị trí cắt | `editorStore.splitClip()` |
| 6 | **Join clip (ghép)** | ✅ | Chọn clip liền kề → phím **J** hoặc Edit → Join Adjacent Clips | Cùng asset/sample hoặc cùng MIDI |
| 7 | Xóa clip | ✅ | Chọn clip → **Del** hoặc Edit → Delete | |
| 8 | Waveform hiển thị clip | ✅ | Peak SVG từ `AudioEngine.getClipPeaks()` | `ClipContent` trong `MusicEditor.tsx` — không dùng Wavesurfer.js |
| 9 | **High-quality Preview (waveform)** | ✅ | Settings → **High-quality Preview** → **Save** → mở lại Editor | HQ: ~1 peak/px (max 512); thường: ~1 peak/2px (max 256). `lib/waveform.ts` |
| 10 | Zoom timeline | ✅ | Slider Zoom trên ruler | `pxPerBeat` 16–64 — zoom cũng tăng độ chi tiết waveform |
| 11 | Undo / Redo | ✅ | **Ctrl+Z** / **Ctrl+Y** | Stack tối đa 30 |
| 12 | Play / Pause / Stop | ✅ | **Space** hoặc nút transport | |
| 13 | Loop vùng phát | ✅ | Nút Loop trên transport | |
| 14 | Metronome | ✅ | Bật/tắt trên transport | |
| 15 | Auto-scroll playhead | ✅ | Bật trong Creator Settings | |
| 16 | Lưu dự án | ✅ | **Ctrl+S** hoặc File → Save | JSONB + version (API) |
| 17 | Đổi tên dự án | ✅ | Click tên trên header editor | |
| 18 | i18n giao diện Editor | ❌ | Menu File/Edit/Mixer, tab, modal | `MusicEditor.tsx` — chưa dùng `useLocaleStore` |

---

### 4.5. Studio Editor — MIDI & Piano Roll

| # | Tính năng | Trạng thái | Cách dùng | Ghi chú |
|---|-----------|------------|-----------|---------|
| 1 | Thêm MIDI clip | ✅ | Track → Add MIDI / double-click lane | |
| 2 | Piano Roll — vẽ nốt | ✅ | Tab MIDI → double-click lưới | `PianoRoll.tsx` |
| 3 | Kéo / resize nốt | ✅ | Drag nốt; mép phải để đổi duration | |
| 4 | Xóa nốt | ✅ | Right-click trên nốt | |
| 5 | **Velocity lane** | ✅ | Kéo thanh dưới lưới nốt lên/xuống (1–127) | Màu nốt theo velocity |
| 6 | Import file .mid | ✅ | Tab MIDI → Import MIDI | `@tonejs/midi` |
| 7 | Export file .mid | ✅ | Tab MIDI → Export MIDI | |
| 8 | Quantize nốt | ✅ | Chọn grid 1/4 – 1/32 → Quantize | `audio/quantize.ts` |
| 9 | Humanize (ngẫu nhiên hóa timing/vel) | ❌ | — | Phase sau |
| 10 | SMF Type 1 multi-track export nâng cao | ❌ | — | Hiện export single track clip |

---

### 4.6. Mixer & FX Chain

| # | Tính năng | Trạng thái | Cách dùng | Ghi chú |
|---|-----------|------------|-----------|---------|
| 1 | Volume per track + Master | ✅ | Tab Mixer — fader từng track | |
| 2 | Pan (L/R) | ✅ | Slider pan trên strip / FX panel | |
| 3 | Mute / Solo | ✅ | Nút M / S trên strip | |
| 4 | VU meter | ✅ | Thanh meter bên fader | `AudioEngine` analyser |
| 5 | **EQ** (peaking +4dB @ 1.2kHz) | ✅ | Nút EQ trên strip hoặc tab Effects | Toggle on/off |
| 6 | **Reverb** (wet 0–100%) | ✅ | Nút Reverb strip hoặc slider Effects | Shared convolver |
| 7 | **Delay** (wet 0–100%) | ✅ | Nút Delay strip (tím) hoặc slider Effects | Tape feedback ~dotted 8th |
| 8 | FX khi export WAV offline | ✅ | Reverb + Delay có trong `renderToWav()` | |
| 9 | Compressor / Limiter track | ❌ | — | Chỉ master limiter nhẹ |

---

### 4.7. Render & Export

| # | Tính năng | Trạng thái | Cách dùng | Ghi chú |
|---|-----------|------------|-----------|---------|
| 1 | Export WAV local (trình duyệt) | ✅ | File → Export Audio | `AudioEngine.renderToWav()` |
| 2 | Server render (API mode) | ✅ | Export → Server Render | BullMQ queue |
| 3 | Worker riêng (Docker prod) | ✅ | Container `worker` trong `docker-compose.prod.yml` | `EMBEDDED_WORKER=false` |
| 4 | Render inline (không Redis) | ✅ | Tự chạy trên API server | Dev local OK |
| 5 | Download file render | ✅ | Poll job → tải WAV | `modules/render/` |

---

### 4.8. Cộng tác real-time (API mode)

| # | Tính năng | Trạng thái | Cách dùng | Ghi chú |
|---|-----------|------------|-----------|---------|
| 1 | Mời member qua **email** | ✅ | Panel Collab trong Editor → nhập email + role | `POST /api/collab/.../invite` |
| 2 | Mời qua **username** | ❌ | Đặc tả có nhưng chưa implement | |
| 3 | Phân quyền Viewer / Editor | ✅ | Viewer = read-only editor | `collabStore.readOnly` |
| 4 | Đồng bộ `project_state` qua WS | ✅ | Tự patch khi chỉnh sửa | Version check đơn giản |
| 5 | Presence (ai đang online) | ✅ | Panel Collab hiển thị members | |
| 6 | Remote cursor trên timeline | ✅ | Vạch vàng + tên user | `collabStore.remoteCursors` |
| 7 | Conflict resolution (OT/CRDT) | ❌ | Last-write-wins | Có thể ghi đè nếu cùng sửa |

---

### 4.9. Hồ sơ & Tài khoản (Profile)

| # | Tính năng | Trạng thái | Cách dùng | Ghi chú |
|---|-----------|------------|-----------|---------|
| 1 | Sidebar giống Dashboard | ✅ | `/profile` — Creator hoặc Admin sidebar | `dashboardNav.ts` |
| 2 | Sửa username, email, bio | ✅ | **Edit Profile** → Save | `PATCH /api/auth/me` |
| 3 | Nhãn Inspired by / Talents / Genres | ✅ | Chỉ sửa khi bật Edit | Lưu `profile_meta` JSONB (API) |
| 4 | Upload avatar & cover | ✅ | Edit → nút camera / hover avatar | Base64 trong `profile_meta` — ⚠️ chưa scale production |
| 5 | Sync profile lên server | ✅ | API mode — Save gửi `profileMeta` | Offline: localStorage |
| 6 | Avatar hiển thị header | ✅ | Sau khi lưu — góc phải mọi trang | `profileImagesStore` |
| 7 | i18n profile đầy đủ | ✅ | EN/VI | `lib/i18n.ts` |

---

### 4.10. Admin Dashboard

| # | Tính năng | Trạng thái | Cách dùng | Ghi chú |
|---|-----------|------------|-----------|---------|
| 1 | Overview thống kê | ✅ | `/admin` — users, projects, banned | |
| 2 | Quản lý user (ban/unban) | ✅ | Tab Users | |
| 3 | Báo cáo nội dung | ✅ | Tab Reports | Mock data + API |
| 4 | System logs | ✅ | Tab Logs | |
| 5 | Admin Settings | ✅ | Tab Settings — i18n, alerts | |
| 6 | Sidebar thương hiệu **MusicLab** | ✅ | Logo ảnh + chữ MusicLab | Giống Creator (không còn chữ A đỏ) |
| 7 | i18n Admin UI | ⚠️ | Settings đã EN/VI | Stats, reports, logs còn tiếng Anh |
| 8 | Ghi audit admin thật | ⚠️ | Log ghi cứng `"Admin"` | Chưa lấy username JWT |

---

### 4.11. Hạ tầng, Deploy & DevOps

| # | Hạng mục | Trạng thái | Cách dùng | Ghi chú |
|---|----------|------------|-----------|---------|
| 1 | Docker Compose dev (Postgres + Redis) | ✅ | `docker compose up -d` | Root repo |
| 2 | Docker Compose production | ✅ | `docker-compose.prod.yml` + `.env.prod` | Full stack + nginx |
| 3 | Deploy Vercel + Railway | ✅ | Xem `deploy/QUICK_DEPLOY.md` | |
| 4 | Nginx reverse proxy | ✅ | `nginx/nginx.conf` — `/api`, `/ws`, SPA | |
| 5 | `.gitignore` | ✅ | Loại trừ `.env`, `node_modules`, `uploads/` | |
| 6 | GitHub Actions CI (build) | ✅ | `.github/workflows/ci.yml` | Chưa chạy test |
| 7 | HTTPS / Certbot template | ❌ | — | Phase 4 |
| 8 | Object storage S3/R2 | ❌ | Upload lưu local disk | Railway ephemeral warning trong docs |
| 9 | Unit / E2E tests | ❌ | — | Phase 4 |
| 10 | Rate limit / Helmet | ❌ | — | Bảo mật production |
| 11 | Git — commit & push repo | ❌ | — | Phần lớn code vẫn **untracked** trên máy local |

---

### 4.12. Nhận diện thương hiệu (Branding)

| # | Tính năng | Trạng thái | Cách dùng | Ghi chú / File |
|---|-----------|------------|-----------|----------------|
| 1 | Logo ảnh MusicLab | ✅ | Sidebar, Landing, Login, SignUp, Editor, loading | `frontend/public/logo-musiclab.png` |
| 2 | Component logo dùng chung | ✅ | `MusicLabLogo` / `MusicLabBrand` | `app/components/MusicLabLogo.tsx` |
| 3 | Favicon tab trình duyệt | ✅ | Tự động khi mở site | `index.html` → `/logo-musiclab.png` |
| 4 | Thay chữ A/M cũ | ✅ | Không còn ô vuông chữ A (admin) / M (creator) | Dùng ảnh logo thống nhất |

---

## 5. Chạy project nhanh (tham chiếu)

### Chỉ Frontend (offline)

```bash
cd frontend && npm install && npm run dev
# http://localhost:5173 — Log in as Creator/Admin
```

### Full-stack local

```bash
docker compose up -d                    # Postgres + Redis
cd backend && cp .env.example .env      # Sửa DATABASE_URL
npm install && npm run db:migrate && npm run db:seed && npm run dev

cd frontend && cp .env.example .env     # VITE_API_URL=http://localhost:4000
npm run dev
```

### Sau khi pull code mới (có thay đổi DB)

```bash
cd backend && npm run db:migrate
```

---

## 6. Kế hoạch tiếp theo (Backlog ưu tiên)

| Ưu tiên | Hạng mục | Trạng thái | Ghi chú |
|---------|----------|------------|---------|
| 🔴 Cao | Git commit & push toàn bộ repo | ❌ | `.gitignore`, CI, frontend, backend chưa vào git |
| 🔴 Cao | HTTPS Certbot + nginx TLS | ❌ | Production VPS |
| 🔴 Cao | S3/R2 cho upload, render, avatar/cover | ❌ | Tránh mất file; thay base64 `profile_meta` |
| 🟡 Trung | Unit tests (auth, render, collab access) | ❌ | Bổ sung vào CI |
| 🟡 Trung | i18n toàn bộ Music Editor | ❌ | UI editor ~100% tiếng Anh cứng |
| 🟡 Trung | i18n Sign Up + Admin dashboard | ❌ | Trang còn thiếu locale |
| 🟡 Trung | Cài đặt Creator/Admin **theo tài khoản** | ❌ | Giống locale — `session.ts` đang global |
| 🟡 Trung | Mời collab bằng username | ❌ | API chỉ nhận email |
| 🟡 Trung | Humanize MIDI | ❌ | Piano Roll |
| 🟢 Thấp | SMF Type 1 multi-track export | ❌ | MIDI nâng cao |
| 🟢 Thấp | Gỡ dep thừa `tone`, `wavesurfer.js` | ❌ | Không import; waveform timeline đã tự vẽ — Wavesurfer chỉ hữu ích nếu làm preview Library full-width |
| 🟢 Thấp | Quên mật khẩu / 2FA | ❌ | Auth nâng cao |
| 🟢 Thấp | Compressor / thêm FX | ❌ | Mixer |
| 🟢 Thấp | Conflict OT/CRDT cho collab | ❌ | Hiện last-write-wins |

---

## 7. Cấu trúc thư mục quan trọng

```
MusicLab/
├── frontend/
│   ├── public/             # logo-musiclab.png (static)
│   └── src/
│       ├── app/pages/          # Landing, Login, Dashboard, Editor, Library, Profile, Admin
│       ├── app/components/     # PianoRoll, SidebarLayout, SettingsPanel, MusicLabLogo
│       ├── audio/              # AudioEngine, midiIo, quantize, synth
│       ├── store/              # authStore, editorStore, collabStore, localeStore
│       ├── services/           # auth, projects, assets, collab, render
│       └── lib/                # api, i18n, session, waveform, dashboardNav, profileMeta, imageUpload
├── backend/src/
│   ├── modules/            # auth, projects, assets, admin, render, collab
│   ├── audio/              # mixer (server render)
│   ├── worker/             # BullMQ render worker
│   └── db/schema.sql       # PostgreSQL schema
├── docs/                   # Đặc tả nghiệp vụ & kế hoạch (folder này)
├── deploy/                 # Hướng dẫn deploy
└── nginx/                  # Production proxy
```

---

## 8. Ghi chú khi cập nhật file này

Khi hoàn thành một tính năng mới:

1. Đổi trạng thái trong bảng mục **4.x** tương ứng (❌ → ⚠️ → ✅).
2. Bổ sung **Cách dùng** ngắn gọn (phím tắt, đường dẫn, menu).
3. Cập nhật **Cập nhật lần cuối** ở đầu file.
4. Nếu là phase mới — thêm vào mục **2** hoặc chuyển hạng mục từ mục **6** sang mục **4**.

---

*Tài liệu này là bản tóm tắt vận hành; chi tiết đặc tả gốc vẫn nằm trong [`web MusicLab.md`](web%20MusicLab.md) và [`mô tả sơ bộ.md`](mô%20tả%20sơ%20bộ.md).*
