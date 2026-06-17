# Deploy MusicLab trên Render (một URL — demo)

Hướng dẫn deploy **frontend + backend chung một domain** trên [Render](https://render.com), tránh cấu hình `VITE_API_URL` và CORS giữa hai host.

```
https://musiclab-xxxx.onrender.com/        → React SPA
https://musiclab-xxxx.onrender.com/api/... → Express API
wss://musiclab-xxxx.onrender.com/ws        → WebSocket collab
```

**Thời gian:** ~20 phút (lần đầu)  
**Chi phí demo:** Free tier (có giới hạn — xem cuối file)

---

## Chuẩn bị

1. Đẩy code lên **GitHub** (repo public hoặc private đều được).
2. Trong repo đã có:
   - `Dockerfile` (root) — build FE + BE một image
   - `render.yaml` — Blueprint tự tạo Postgres + Web Service

---

## Cách A — Blueprint (khuyến nghị, ít thao tác nhất)

### Bước 1: Tạo Blueprint

1. Đăng nhập [Render Dashboard](https://dashboard.render.com)
2. **New +** → **Blueprint**
3. Connect GitHub → chọn repo **MusicLab**
4. Render đọc `render.yaml` → hiện **PostgreSQL** + **Web Service**
5. Bấm **Apply**

### Bước 2: Chờ deploy xong

- Lần build đầu ~5–10 phút (npm ci × 2 + Vite build).
- Khi **Live**, copy URL dạng `https://musiclab-xxxx.onrender.com`

### Bước 3: CORS (cùng origin)

Vào Web Service **musiclab** → **Environment**:

| Biến | Giá trị |
|------|---------|
| `CORS_ORIGIN` | URL Render của bạn, vd `https://musiclab-xxxx.onrender.com` |

→ **Save Changes** → đợi redeploy.

### Bước 4: Seed tài khoản demo

Web Service → **Shell**:

```bash
node dist/db/seed.js
```

### Bước 5: Kiểm tra

| Kiểm tra | Kỳ vọng |
|----------|---------|
| `https://your-app.onrender.com/api/health` | `{"ok":true,...}` |
| Mở URL gốc | Trang Landing / Login |
| Login `creator@musiclab.com` / `demo1234` | Vào Dashboard |

---

## Cách B — Tạo tay từng service

Dùng khi không muốn Blueprint.

### 1. PostgreSQL

1. **New +** → **PostgreSQL**
2. Name: `musiclab-db` · Plan: **Free**
3. Tạo xong → tab **Connections** → copy **Internal Database URL**

### 2. Web Service (Docker)

1. **New +** → **Web Service**
2. Connect repo GitHub
3. Cấu hình:

| Mục | Giá trị |
|-----|---------|
| **Name** | `musiclab` |
| **Region** | Singapore hoặc gần bạn nhất |
| **Branch** | `main` / `master` |
| **Runtime** | **Docker** |
| **Dockerfile Path** | `./Dockerfile` |
| **Instance Type** | Free |

4. **Environment Variables:**

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `SERVE_SPA` | `true` |
| `EMBEDDED_WORKER` | `true` |
| `JWT_SECRET` | Chuỗi random 32+ ký tự |
| `DATABASE_URL` | Internal URL từ Postgres |
| `CORS_ORIGIN` | `https://<tên-service>.onrender.com` (sau khi có URL) |
| `PORT` | `4000` |

5. **Health Check Path:** `/api/health`
6. **Create Web Service**

### 3. Seed & test

Giống **Cách A** bước 4–5.

---

## Biến môi trường (tham chiếu)

| Biến | Bắt buộc | Mô tả |
|------|----------|--------|
| `DATABASE_URL` | ✅ | PostgreSQL (ưu tiên **Internal** URL trên Render) |
| `JWT_SECRET` | ✅ | Secret mạnh; production từ chối start nếu dùng giá trị dev |
| `SERVE_SPA` | ✅ | `true` — Express serve thư mục `public/` (frontend build) |
| `CORS_ORIGIN` | ✅ | URL public của Web Service |
| `EMBEDDED_WORKER` | Khuyến nghị `true` demo | Render job trong API, không cần Redis/worker riêng |
| `REDIS_URL` | ❌ demo | Không cần — render chạy **inline** |
| `PORT` | Render inject | Giữ `4000` hoặc để Render gán |

---

## Tài khoản demo (sau seed)

| Role | Email | Password |
|------|-------|----------|
| Creator | `creator@musiclab.com` | `demo1234` |
| Admin | `admin@musiclab.com` | `demo1234` |

---

## Free tier — cần biết

| Hạn chế | Ảnh hưởng |
|---------|------------|
| Web service **sleep** sau ~15 phút không truy cập | Lần mở đầu chậm 30–60s |
| Postgres free **hết hạn / giới hạn** sau 90 ngày (theo chính sách Render) | Demo đồ án OK, production cần plan trả phí |
| Disk **ephemeral** | Upload/render file có thể **mất khi redeploy** |
| Không Redis riêng | Server render chạy inline — đủ demo |

**Collab WebSocket:** hoạt động trên cùng host; có thể ngắt khi service sleep.

---

## Xử lý lỗi thường gặp

### Build fail

- Xem **Logs** → thường do `npm ci` hoặc TypeScript.
- Chạy local: `docker build -t musiclab .` từ thư mục gốc repo.

### `Migration failed` / không kết nối DB

- `DATABASE_URL` phải là **Internal** URL (không dùng external từ máy local).
- Postgres và Web Service cùng **region**.

### Login không được / 401

- Chạy lại seed: `node dist/db/seed.js` trong Shell.
- Kiểm tra `JWT_SECRET` đã set.

### Trang trắng sau deploy

- Kiểm tra `SERVE_SPA=true`.
- Logs có `MusicLab API listening on port`?

### Upload Library báo lỗi sau redeploy

- Bình thường trên free tier (disk tạm). Demo: upload lại file.

---

## Nâng cấp sau demo

| Nhu cầu | Hướng xử lý |
|---------|-------------|
| Luôn online | Plan **Starter** (~$7/tháng) cho Web Service |
| File upload bền | S3 / Cloudflare R2 (xem backlog `docs/kế hoạch.md`) |
| Render queue riêng | Thêm Render **Redis** + service worker + `EMBEDDED_WORKER=false` |

---

## So sánh với Vercel + Railway

| | Render (một URL) | Vercel + Railway |
|--|------------------|------------------|
| Số domain | **1** | 2 |
| `VITE_API_URL` | Không cần | Phải set lúc build |
| CORS | Đơn giản | Phải khớp 2 URL |
| Setup | Blueprint / Docker | 2 nền tảng |

---

*Tài liệu liên quan: [`QUICK_DEPLOY.md`](QUICK_DEPLOY.md) (Railway/Vercel, VPS) · [`../README.md`](../README.md)*
