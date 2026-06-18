# BÁO CÁO TIẾN ĐỘ DỰ ÁN MUSICLAB

**Giai đoạn báo cáo:** Tuần 1 & Tuần 2  
**Dự án:** MusicLab (MusLab) — Nền tảng Web-DAW trên trình duyệt  
**Cập nhật:** 18/06/2026  
**Tài liệu tham chiếu:** [`kế hoạch báo cáo.md`](kế%20hoạch%20báo%20cáo.md) · [`kế hoạch.md`](kế%20hoạch.md)

---

## PHẦN MỞ ĐẦU

Báo cáo này tổng hợp kết quả triển khai **hai tuần đầu** của đồ án MusicLab, bám sát kế hoạch báo cáo tiến độ đã đề ra. Phần đầu mô tả tổng quan hệ thống và các chức năng mục tiêu; phần sau trình bày chi tiết công việc đã hoàn thành, kết quả đạt được và gợi ý minh chứng phục vụ báo cáo với giảng viên.

---

# PHẦN I — MÔ TẢ HỆ THỐNG VÀ PHẠM VI CHỨC NĂNG

## I. Mô tả bài toán

Nhu cầu sáng tác và sản xuất âm nhạc kỹ thuật số ngày càng phổ biến. Các phần mềm DAW truyền thống (FL Studio, Ableton Live) mạnh về tính năng nhưng thường yêu cầu cài đặt phức tạp, cấu hình phần cứng cao, chi phí bản quyền và hạn chế cộng tác trực tuyến theo thời gian thực.

Các nền tảng Web-DAW (BandLab, Soundtrap) đã chứng minh khả năng xử lý âm thanh trên trình duyệt. Tuy nhiên, tối ưu luồng dữ liệu lớn và trải nghiệm biên tập mượt mà vẫn là thách thức kỹ thuật.

**MusicLab** hướng tới xây dựng một Web-DAW MVP cho phép người dùng tải mẫu âm thanh, sắp xếp trên Timeline, chỉnh Mixer và (ở các giai đoạn sau) cộng tác trực tuyến — không cần cài đặt phần mềm.

---

## II. Mục tiêu website

**Mục tiêu chính:**

- Môi trường studio âm nhạc thu nhỏ trên nền tảng Web, ổn định luồng dữ liệu và trải nghiệm biên tập mượt mà.
- Kiến trúc Modular Monolithic quản lý cấu trúc dữ liệu bản nhạc (JSON) và xử lý tác vụ nặng (render âm thanh) qua worker/queue.

**Mục tiêu cụ thể (MVP):**

| STT | Mục tiêu |
|-----|----------|
| 1 | Đăng ký, quản lý kho tài nguyên âm thanh cá nhân |
| 2 | Timeline đa track — cắt, ghép, di chuyển clip |
| 3 | Mixer cơ bản — volume, pan, hiệu ứng |
| 4 | Mời thành viên vào dự án (Viewer / Editor) |

---

## III. Xác định phạm vi

Hệ thống MVP tập trung hai phân hệ cốt lõi:

| Phân hệ | Mô tả | Chi tiết |
|---------|--------|----------|
| **Thư viện (Library)** | Quản lý tài nguyên và trạng thái | Upload asset, lưu `project_state`, sample library tích hợp |
| **Studio Editor** | Biên tập & xử lý âm thanh | Timeline đa luồng, kéo thả, cắt ghép; Mixer & FX; export WAV |

*Ghi chú tiến độ:* Trong hai tuần đầu, phạm vi triển khai tập trung **hạ tầng, xác thực, quản lý dự án và khung giao diện**. Library và Editor đầy đủ được hoàn thiện dần từ tuần 3 trở đi (đã có nền tảng code sẵn sàng mở rộng).

---

## IV. Danh sách Actor (tác nhân)

| Actor | Mô tả | Quyền hạn chính |
|-------|--------|-----------------|
| **Guest** | Chưa đăng nhập | Xem trang Landing, đăng ký/đăng nhập |
| **Creator** | Người làm nhạc | Tạo dự án, upload tài nguyên, biên tập, mời cộng tác |
| **Admin** | Quản trị viên | Quản lý user, báo cáo vi phạm, system logs |

---

## V. Danh sách chức năng chính (MVP)

### Nhóm 1: Quản lý tài khoản và hệ thống

- Đăng ký, đăng nhập, đăng xuất (JWT).
- Quản lý thông tin cá nhân; theo dõi hạn mức lưu trữ (quota 500 MB — giai đoạn sau).

### Nhóm 2: Quản lý thư viện tài nguyên (Assets)

- Upload file `.mp3`, `.wav`, …
- Danh sách, nghe thử, xóa asset.

### Nhóm 3: Studio Editor (Timeline)

- Tạo/lưu/tải `project_state` (JSONB).
- Kéo thả audio vào Timeline; Split, Join, di chuyển clip đa track.

### Nhóm 4: Mixer & FX

- Volume, Pan từng track và Master.
- EQ, Reverb, Delay; render mixdown WAV.

### Nhóm 5: Cộng tác

- Mời thành viên qua email; phân quyền Viewer / Editor.
- Đồng bộ chỉnh sửa qua WebSocket.

### Nhóm 6: Quản trị (Admin)

- Thống kê hệ thống; quản lý user (ban/unban).
- Xử lý báo cáo; ghi system logs.

---

## VI. Sơ đồ chức năng tổng quát

```
Website Web-DAW (MusicLab)
│
├── 1. QUẢN LÝ TÀI KHOẢN
│      Đăng ký / Đăng nhập / Đăng xuất · Thông tin cá nhân · Dung lượng lưu trữ
│
├── 2. THƯ VIỆN & TÀI NGUYÊN
│      Upload audio · Quản lý Assets · Danh sách dự án
│
├── 3. STUDIO EDITOR
│      Quản lý Track · Thao tác Clip · Waveform
│
├── 4. MIXER & RENDER
│      Volume & Pan · Render / Export WAV
│
├── 5. CỘNG TÁC DỰ ÁN
│      Chia sẻ & phân quyền · Đồng bộ chỉnh sửa
│
└── 6. ADMIN DASHBOARD
       Overview · User Management · System Logs
```

---

## VII. Công nghệ sử dụng

| Thành phần | Theo kế hoạch đề xuất | Thực tế triển khai (đến tuần 2) |
|------------|------------------------|----------------------------------|
| **Frontend** | React + Tailwind | React 18, Vite 6, Tailwind v4, Zustand, React Router 7 |
| **Audio** | Web Audio API + Wavesurfer.js | Web Audio API thuần (`AudioEngine.ts`); waveform SVG tùy chỉnh *(Wavesurfer dự kiến tuần 3, thực tế đã dùng giải pháp tự vẽ)* |
| **Backend** | Node.js + Express (Modular Monolithic) | Express + TypeScript, modules: `auth`, `projects`, `assets`, `admin`, `render`, `collab` |
| **Database** | PostgreSQL + JSONB | `users`, `projects`, `assets`, `project_members`, `admin_logs`, … |
| **Queue / Deploy** | Redis, Nginx | `docker-compose.yml` (Postgres + Redis); CI GitHub Actions *(triển khai cloud: tuần sau)* |

---

# PHẦN II — BÁO CÁO TUẦN 1

## 1. Mục tiêu tuần 1

> *Hoàn thiện bộ khung sườn cơ bản cho toàn bộ hệ thống: mã nguồn, Backend Modular Monolithic, kết nối PostgreSQL và khởi tạo CSDL.*

## 2. Công việc đã thực hiện

### 2.1. Quản lý mã nguồn và cấu trúc monorepo

| Hạng mục | Chi tiết | Trạng thái |
|----------|----------|------------|
| Kho Git / GitHub | Repo `MusicLab`, nhánh phát triển, `.gitignore` loại trừ `.env`, `node_modules`, `uploads/`, `dist/` | ✅ |
| Cấu trúc thư mục gốc | `frontend/`, `backend/`, `docs/`, `deploy/`, `nginx/`, `docker-compose.yml` | ✅ |
| CI cơ bản | `.github/workflows/ci.yml` — build frontend + backend khi push/PR | ✅ |

### 2.2. Khởi tạo Backend (Modular Monolithic)

Đã dựng khung **Node.js + Express + TypeScript** với tách module theo nghiệp vụ:

```
backend/src/
├── modules/
│   ├── auth/        # Đăng ký, đăng nhập, JWT, profile
│   ├── projects/    # CRUD dự án, project_state JSONB
│   ├── assets/      # Upload/download file âm thanh
│   ├── admin/       # Quản trị user, logs, thống kê
│   ├── render/      # Hàng đợi render WAV (chuẩn bị tuần sau)
│   └── collab/      # Thành viên dự án + WebSocket (chuẩn bị tuần sau)
├── db/
│   ├── schema.sql   # Script tạo bảng
│   ├── migrate.ts   # Chạy migration
│   └── seed.ts      # Dữ liệu demo
├── middleware/      # auth, error handler
└── config.ts        # Biến môi trường
```

Các module `auth`, `projects`, `assets` là trọng tâm tuần 1–2; `render`, `collab` được tạo sẵn cấu trúc để mở rộng không phá vỡ kiến trúc.

### 2.3. Cơ sở dữ liệu PostgreSQL

Đã viết và chạy thành công `backend/src/db/schema.sql`, tạo các bảng:

| Bảng | Mục đích |
|------|----------|
| `users` | Tài khoản (creator/admin), `password_hash`, `profile_meta` JSONB |
| `projects` | Dự án nhạc, trường `state` JSONB lưu timeline/tracks |
| `assets` | Metadata file upload (đường dẫn, dung lượng, định dạng) |
| `project_members` | Thành viên dự án, vai trò viewer/editor |
| `admin_logs` | Nhật ký thao tác quản trị |
| `admin_reports` | Báo cáo nội dung/tài khoản |
| `render_jobs` | Trạng thái job render WAV (chuẩn bị giai đoạn sau) |

**Lệnh khởi tạo local:**

```bash
docker compose up -d          # Postgres + Redis
cd backend && npm run db:migrate
```

### 2.4. Hạ tầng phát triển local

- `docker-compose.yml`: PostgreSQL 16 + Redis 7.
- `backend/.env.example`: mẫu `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`.
- Script `npm run dev` (API), `npm run db:migrate`, `npm run db:seed`.

## 3. Kết quả tuần 1

| Tiêu chí kế hoạch | Kết quả |
|-------------------|---------|
| Thiết lập Git/GitHub | Repo có cấu trúc monorepo chuẩn, CI build pass |
| Backend Modular Monolithic | 6 module tách biệt, entry `src/index.ts` + `app.ts` |
| Kết nối PostgreSQL + 5+ bảng | Migration chạy thành công; quan hệ FK đầy đủ |
| Minh chứng | Ảnh cấu trúc thư mục; ảnh/pgAdmin hoặc DBeaver hiển thị các bảng; log `Database schema applied.` |

## 4. Gợi ý minh chứng báo cáo (Tuần 1)

1. Screenshot cây thư mục `backend/src/modules/`.
2. Screenshot bảng `users`, `projects`, `assets` trong PostgreSQL.
3. Screenshot terminal: `npm run db:migrate` thành công.
4. Screenshot `GET http://localhost:4000/api/health` → `{"ok":true}`.

---

# PHẦN III — BÁO CÁO TUẦN 2

## 1. Mục tiêu tuần 2

> *Hệ thống có thể đăng nhập và hiển thị khung giao diện: API JWT hoàn chỉnh, API tạo dự án; giao diện React cho Landing, Auth và Dashboard.*

## 2. Công việc đã thực hiện

### 2.1. Backend — Module xác thực và dự án

#### API Authentication (`/api/auth`)

| Endpoint | Phương thức | Mô tả |
|----------|-------------|--------|
| `/api/auth/signup` | POST | Đăng ký Creator mới |
| `/api/auth/login` | POST | Đăng nhập bằng email hoặc username |
| `/api/auth/me` | GET | Lấy thông tin user hiện tại (JWT) |
| `/api/auth/me` | PATCH | Cập nhật profile (`username`, `email`, `bio`, `profileMeta`) |

- Mật khẩu hash bằng **bcryptjs**.
- Token **JWT** lưu phía client; middleware `requireAuth` bảo vệ route.
- Phân quyền role: `creator` | `admin`.
- Seed demo: `creator@musiclab.com` / `admin@musiclab.com` — mật khẩu `demo1234`.

#### API Projects (`/api/projects`)

| Endpoint | Phương thức | Mô tả |
|----------|-------------|--------|
| `/api/projects` | GET | Danh sách dự án của user |
| `/api/projects` | POST | Tạo dự án mới (tên, privacy, `state` mặc định) |
| `/api/projects/:id` | GET | Chi tiết dự án |
| `/api/projects/:id` | PUT | Cập nhật `name`, `status`, `state` (JSONB) |
| `/api/projects/:id/privacy` | PATCH | Bật/tắt Public ↔ Private (chỉ owner) |
| `/api/projects/:id` | DELETE | Xóa dự án (chỉ owner) |

`project_state` lưu dạng JSONB — chuẩn bị cho Editor (BPM, tracks, clips) các tuần tiếp theo.

### 2.2. Frontend — Giao diện và luồng người dùng

Đã dựng SPA **React + Tailwind** với các trang:

| Trang | Route | Nội dung |
|-------|-------|----------|
| **Landing** | `/` | Giới thiệu MusicLab, nút Log In / Sign Up |
| **Đăng nhập** | `/login` | Form đăng nhập + nút demo Creator/Admin |
| **Đăng ký** | `/signup` | Form tạo tài khoản Creator |
| **Dashboard Creator** | `/dashboard` | Sidebar (Home, Library, Projects, Settings); tab Recent Projects |
| **Admin Dashboard** | `/admin` | Overview, Users, Reports, Logs, Settings |

**Điểm kỹ thuật:**

- **Dual-mode:** không cần backend (`IndexedDB` + seed local) hoặc kết nối API (`VITE_API_URL`).
- **Route guard:** chặn truy cập theo role (`Creator` / `Admin`).
- **SidebarLayout** dùng chung: logo MusicLab, điều hướng, avatar, đăng xuất.
- **Zustand** (`authStore`) quản lý phiên đăng nhập.

### 2.3. Tích hợp Frontend ↔ Backend

| Luồng | Mô tả |
|-------|--------|
| Đăng ký | Form → `POST /api/auth/signup` → lưu JWT → chuyển Dashboard |
| Đăng nhập | Form → `POST /api/auth/login` → JWT → Dashboard hoặc Admin |
| Danh sách dự án | `GET /api/projects` → hiển thị Recent Projects *(vượt mức “dữ liệu giả” trong kế hoạch — đã nối API thật)* |
| Tạo dự án | Nút **Create Project** → `POST /api/projects` → mở Editor |

### 2.4. Bổ sung ngoài kế hoạch tuần 2 (nền tảng sẵn sàng)

Các hạng mục sau **không thuộc yêu cầu bắt buộc tuần 2** nhưng đã có khung code để không làm lại từ đầu:

- Module `assets`, `admin` (API + trang Admin UI).
- Trang `ProfilePage`, `LibraryPage` (routing đã có).
- i18n EN/VI một phần (Landing, Login, Settings).

*Phần này chỉ ghi nhận tiến độ thực tế; báo cáo chính thức tuần 2 vẫn xoay quanh Auth + Projects + Dashboard.*

## 3. Kết quả tuần 2

| Tiêu chí kế hoạch | Kết quả |
|-------------------|---------|
| API Đăng ký / Đăng nhập JWT | Hoàn thành, test Postman/curl OK |
| Phân quyền cơ bản | Creator / Admin tách route và dashboard |
| API tạo dự án | `POST /api/projects` hoạt động |
| Giao diện Landing + Auth + Dashboard | React render đầy đủ, responsive dark theme |
| Recent Projects | Hiển thị danh sách từ API (hoặc IndexedDB offline) |
| Minh chứng | Postman collection/login; screenshot Dashboard; video đăng nhập → thấy danh sách dự án |

## 4. Gợi ý minh chứng báo cáo (Tuần 2)

**Backend (Postman / curl):** — hướng dẫn đầy đủ: [`docs/API_TEST.md`](API_TEST.md)

```bash
# Health (không cần token)
curl.exe http://127.0.0.1:4000/api/health

# Đăng nhập — lấy token từ field "token" trong response
curl.exe -X POST http://127.0.0.1:4000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"identifier\":\"creator@musiclab.com\",\"password\":\"demo1234\"}"

# Tạo dự án (thay <TOKEN>); body dùng "privacy", không phải "status"
curl.exe -X POST http://127.0.0.1:4000/api/projects ^
  -H "Authorization: Bearer <TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Demo Beat\",\"privacy\":\"private\"}"

# Cập nhật tên dự án (thay <TOKEN> và <PROJECT_ID>)
curl.exe -X PUT http://127.0.0.1:4000/api/projects/<PROJECT_ID> ^
  -H "Authorization: Bearer <TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Renamed Beat\"}"
```

**Frontend:**

1. Screenshot trang Landing và Login.
2. Screenshot Dashboard Creator — tab **My Projects** có ít nhất một dự án.
3. Screenshot đăng nhập Admin → trang `/admin` Overview.
4. (Tùy chọn) Video: đăng ký tài khoản mới → tạo project → thấy trong danh sách.

---

# PHẦN IV — TỔNG KẾT HAI TUẦN ĐẦU

## 1. Bảng đối chiếu kế hoạch — thực tế

| Tuần | Mục tiêu kế hoạch | Mức hoàn thành | Ghi chú |
|------|-------------------|----------------|---------|
| **1** | Git + Backend khung + PostgreSQL | **100%** | Thêm CI, Docker Compose, 7 bảng CSDL (nhiều hơn 5 bảng tối thiểu) |
| **2** | JWT Auth + API Project + UI tĩnh | **100%** | UI đã nối API thật; có thêm Admin UI và dual-mode offline |

## 2. Sản phẩm có thể demo sau tuần 2

Người dùng có thể:

1. Mở trang chủ MusicLab và đăng ký / đăng nhập.
2. Vào Dashboard Creator, xem và tạo dự án mới.
3. Đăng nhập Admin, xem overview và quản lý user (giao diện).
4. Chạy toàn bộ stack local: Docker + `npm run dev` (backend + frontend).

**Chưa yêu cầu ở tuần 2:** Timeline Editor đầy đủ, upload Library, Mixer, cộng tác WebSocket — *kế hoạch tuần 3–5*.

## 3. Khó khăn và cách xử lý

| Khó khăn | Cách xử lý |
|----------|------------|
| Cấu hình `DATABASE_URL` / quyền PostgreSQL local | Chuẩn hóa `.env.example`, hướng dẫn `docker compose` |
| Đồng bộ Frontend offline vs API mode | Lớp `services/` abstraction + `VITE_API_URL` / `VITE_USE_API` |
| Phân quyền route Admin/Creator | `RouteGuards` + role trong JWT payload |

## 4. Hướng phát triển tuần 3 trở đi

Theo [`kế hoạch báo cáo.md`](kế%20hoạch%20báo%20cáo.md):

| Tuần | Trọng tâm |
|------|-----------|
| **3** | Studio Editor, Web Audio API, Timeline đa track, kéo thả & phát nhạc |
| **4** | Upload Assets, lưu `project_state` khi chỉnh Timeline |
| **5** | Mixer, hoàn thiện MVP, demo video, slide bảo vệ |

*Chi tiết trạng thái code hiện tại (đã vượt xa tuần 2): xem [`kế hoạch.md`](kế%20hoạch.md).*

---

## PHỤ LỤC — Cấu trúc repo sau tuần 2

```
MusicLab/
├── frontend/src/
│   ├── app/pages/       LandingPage, LogInPage, SignUpPage,
│   │                    CreatorDashboard, AdminDashboard, …
│   ├── app/components/  SidebarLayout, RouteGuards, …
│   ├── services/        auth, projects, assets, …
│   └── store/           authStore, …
├── backend/src/
│   ├── modules/         auth, projects, assets, admin, …
│   └── db/              schema.sql, migrate.ts, seed.ts
├── docs/
│   ├── kế hoạch báo cáo.md
│   ├── kế hoạch.md
│   └── báo cáo.md       ← tài liệu này
├── docker-compose.yml
└── README.md
```

---

*Tài liệu biên soạn theo [`kế hoạch báo cáo.md`](kế%20hoạch%20báo%20cáo.md) và đối chiếu mã nguồn thực tế tại thời điểm báo cáo.*
