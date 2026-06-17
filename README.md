# MusicLab

Web-DAW (Digital Audio Workstation) chạy trên trình duyệt — monorepo **frontend** (React SPA) + **backend** (Express API).

## Cấu trúc thư mục

```
MusicLab/
├── frontend/          # React + Vite SPA (Studio, Library, Dashboard, Admin)
├── backend/           # Express API, WebSocket collab, render worker
├── docs/              # Đặc tả nghiệp vụ & kế hoạch triển khai
├── deploy/            # Hướng dẫn deploy
├── nginx/             # Cấu hình reverse proxy (production VPS)
├── .github/workflows/ # CI (build frontend + backend)
├── docker-compose.yml
├── docker-compose.prod.yml
└── README.md
```

| Tài liệu | Mô tả |
|----------|--------|
| [`docs/kế hoạch.md`](docs/kế%20hoạch.md) | **Trạng thái tính năng & backlog** |
| [`docs/web MusicLab.md`](docs/web%20MusicLab.md) | Đặc tả chức năng MVP |
| [`docs/mô tả sơ bộ.md`](docs/mô%20tả%20sơ%20bộ.md) | Kiến trúc hệ thống |
| [`deploy/QUICK_DEPLOY.md`](deploy/QUICK_DEPLOY.md) | Deploy Vercel + Railway / VPS |

## Yêu cầu

- Node.js 20+
- Docker (tùy chọn, cho PostgreSQL + Redis local)

## Chạy nhanh — chỉ Frontend (offline)

```bash
cd frontend
npm install
npm run dev
```

Mở http://localhost:5173 → **Log in as Creator** hoặc **Log in as Admin** (dữ liệu IndexedDB).

## Chạy Full-stack

### 1. PostgreSQL + Redis

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env    # sửa DATABASE_URL, JWT_SECRET
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

| Biến | Mô tả |
|------|--------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Bắt buộc mạnh khi `NODE_ENV=production` |
| `REDIS_URL` | Tùy chọn — không có thì render chạy inline |
| `EMBEDDED_WORKER` | `true` (mặc định dev) / `false` khi có worker container riêng |

- API: http://localhost:4000/api/health  
- WebSocket: `ws://localhost:4000/ws?token=JWT&projectId=ID`

### 3. Frontend (API mode)

```bash
cd frontend
cp .env.example .env
npm run dev
```

`.env` dev:

```
VITE_API_URL=http://localhost:4000
```

Deploy same-origin (Nginx/VPS): để trống `VITE_API_URL`, set `VITE_USE_API=true`.

### Tài khoản demo (API mode)

| Role | Email | Password |
|------|-------|----------|
| Creator | creator@musiclab.com | demo1234 |
| Admin | admin@musiclab.com | demo1234 |

## Scripts thường dùng

| Lệnh | Thư mục | Mô tả |
|------|---------|--------|
| `npm run dev` | `frontend/` | Dev server Vite |
| `npm run build` | `frontend/` | Build production → `dist/` |
| `npm run dev` | `backend/` | API + WS (tsx watch) |
| `npm run build` | `backend/` | Compile TypeScript → `dist/` |
| `npm run db:migrate` | `backend/` | Chạy schema SQL |
| `npm run db:seed` | `backend/` | Seed tài khoản demo |
| `npm run worker` | `backend/` | Worker render (dev) |

## Deploy

| Cách | Hướng dẫn |
|------|-------------|
| Vercel + Railway | [`deploy/QUICK_DEPLOY.md`](deploy/QUICK_DEPLOY.md) |
| VPS + Docker + Nginx | `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build` |

## Tính năng chính

- **Studio Editor** — timeline đa track, MIDI/Piano Roll, velocity, split/join clip, EQ/reverb/delay, export WAV
- **Cộng tác** — WebSocket sync, remote cursor, Viewer/Editor (API mode)
- **Library** — upload audio, quota 500 MB, sample library
- **Auth & Admin** — JWT, profile (avatar/cover), i18n EN/VI theo tài khoản

> Chi tiết trạng thái từng tính năng: [`docs/kế hoạch.md`](docs/kế%20hoạch.md)
