# Deploy nhanh MusicLab (ít config)

Hai lựa chọn: **Vercel + Railway** (khuyến nghị, ~15 phút) hoặc **VPS + Docker Compose + Nginx** (một lệnh, tự host).

---

## Cách 1 — Vercel (frontend) + Railway (backend) ⭐

### Bước 1: Backend trên Railway

1. Tạo tài khoản [Railway](https://railway.app) → **New Project**
2. **Add PostgreSQL** → copy `DATABASE_URL`
3. **Add Redis** → copy `REDIS_URL`
4. **Deploy from GitHub** → chọn repo, root directory: `backend`
5. Variables (Settings → Variables):

| Biến | Giá trị |
|------|---------|
| `DATABASE_URL` | (từ PostgreSQL plugin) |
| `REDIS_URL` | (từ Redis plugin) |
| `JWT_SECRET` | chuỗi random dài (32+ ký tự) |
| `CORS_ORIGIN` | URL Vercel sau bước 2, vd `https://musiclab.vercel.app` |
| `PORT` | `4000` (Railway thường inject `PORT` tự động) |

6. Railway dùng `railway.toml` → tự chạy migrate + start
7. Copy **public URL** API, vd `https://musiclab-api-production.up.railway.app`

### Bước 2: Frontend trên Vercel

1. [Vercel](https://vercel.com) → Import GitHub repo
2. **Root Directory:** `frontend`
3. **Environment Variables:**

```
VITE_API_URL=https://musiclab-api-production.up.railway.app
```

4. Deploy → copy URL frontend

### Bước 3: Cập nhật CORS

Quay lại Railway → sửa `CORS_ORIGIN` = URL Vercel chính xác → Redeploy.

### Bước 4: Seed demo (tùy chọn)

Railway → backend service → **Shell**:

```bash
npm run db:seed
```

### Kiểm tra

- `https://your-api.railway.app/api/health` → `{ "ok": true }`
- Mở Vercel URL → Login → `creator@musiclab.com` / `demo1234` (sau seed)

**WebSocket collab:** `wss://your-api.railway.app/ws` — frontend tự nối qua `VITE_API_URL`.

---

## Cách 2 — VPS + Nginx (một stack Docker)

Phù hợp khi có VPS (Hetzner, DigitalOcean, …).

```bash
cp .env.prod.example .env.prod
# Sửa POSTGRES_PASSWORD, JWT_SECRET, CORS_ORIGIN

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Mở `http://IP-VPS` — Nginx serve SPA + proxy `/api` + `/ws`.

- `PUBLIC_API_URL` để **trống** → frontend gọi API cùng origin (`VITE_USE_API=true`)
- Thêm HTTPS: cài Certbot hoặc Cloudflare proxy

Chi tiết: xem `docker-compose.prod.yml` và `nginx/nginx.conf`.

---

## So sánh nhanh

| | Vercel + Railway | VPS + Nginx |
|--|------------------|-------------|
| Thời gian setup | ~15 phút | ~30 phút |
| Chi phí | Free tier / ~$5+/tháng | VPS ~$5+/tháng |
| HTTPS | Tự động | Tự cấu hình |
| Upload file | Railway volume | Docker volume |
| Đồ án/demo | ⭐ Rất hợp | ⭐ Ổn định lâu dài |

---

## Lưu ý production

1. **Đổi `JWT_SECRET`** — không dùng giá trị dev
2. **Railway free tier** — Postgres/Redis có giới hạn; sleep khi idle
3. **Upload** — Railway ephemeral disk; production thật nên dùng S3/R2 sau
4. **Build frontend** — `VITE_API_URL` phải set **lúc build** trên Vercel
