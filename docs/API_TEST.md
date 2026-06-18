# Hướng dẫn test API — MusicLab (Tuần 2)

Tài liệu này mô tả cách kiểm tra các endpoint **Auth** và **Projects** dùng trong báo cáo Tuần 2 (`docs/báo cáo.md`, Phần III).

**Base URL (local):** `http://127.0.0.1:4000`  
Dùng `127.0.0.1` thay vì `localhost` trên Windows để tránh timeout khi test bằng PowerShell/curl.

---

## 1. Chuẩn bị

### 1.1. Khởi động hạ tầng

```bash
# PostgreSQL + Redis
docker compose up -d

# Backend
cd backend
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Chờ log: `MusicLab API listening on port 4000`.

### 1.2. Kiểm tra health

```bash
curl.exe http://127.0.0.1:4000/api/health
```

Kết quả mong đợi:

```json
{"ok":true,"service":"musiclab-api"}
```

### 1.3. Tài khoản demo (sau `db:seed`)

| Role | Email | Password |
|------|-------|----------|
| Creator | creator@musiclab.com | demo1234 |
| Admin | admin@musiclab.com | demo1234 |

### 1.4. Công cụ

- **curl.exe** — có sẵn trên Windows 10+
- **Postman** / **Thunder Client** (VS Code)
- **PowerShell** — `Invoke-RestMethod`

Mọi request có JWT cần header:

```
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

---

## 2. API Authentication (`/api/auth`)

### 2.1. POST `/api/auth/signup` — Đăng ký

Không cần token.

**Body:**

```json
{
  "email": "newuser@example.com",
  "username": "newuser",
  "password": "demo1234"
}
```

```bash
curl.exe -X POST http://127.0.0.1:4000/api/auth/signup ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"newuser@example.com\",\"username\":\"newuser\",\"password\":\"demo1234\"}"
```

**Response:** `201` — `{ "user": {...}, "token": "eyJ..." }`

---

### 2.2. POST `/api/auth/login` — Đăng nhập

Không cần token. `identifier` có thể là email hoặc username.

**Body:**

```json
{
  "identifier": "creator@musiclab.com",
  "password": "demo1234"
}
```

```bash
curl.exe -X POST http://127.0.0.1:4000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"identifier\":\"creator@musiclab.com\",\"password\":\"demo1234\"}"
```

**Response:** `200` — `{ "user": {...}, "token": "eyJ..." }`

Lưu `token` để dùng cho các request sau.

**PowerShell — lưu token vào biến:**

```powershell
$base = "http://127.0.0.1:4000"
$login = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" `
  -ContentType "application/json" `
  -Body '{"identifier":"creator@musiclab.com","password":"demo1234"}'
$token = $login.token
$headers = @{ Authorization = "Bearer $token" }
```

---

### 2.3. GET `/api/auth/me` — Thông tin user hiện tại

Cần JWT.

```bash
curl.exe http://127.0.0.1:4000/api/auth/me ^
  -H "Authorization: Bearer <TOKEN>"
```

**Response:** `200` — `{ "user": { "id", "username", "email", "role", ... } }`

---

### 2.4. PATCH `/api/auth/me` — Cập nhật profile

Cần JWT. Gửi ít nhất một field.

**Body (ví dụ):**

```json
{
  "bio": "Hello MusicLab",
  "profileMeta": {
    "locale": "vi"
  }
}
```

Các field hỗ trợ: `username`, `email`, `bio`, `profileMeta` (gồm `avatarUrl`, `coverUrl`, `locale`, `labels`).

```bash
curl.exe -X PATCH http://127.0.0.1:4000/api/auth/me ^
  -H "Authorization: Bearer <TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"bio\":\"Hello MusicLab\",\"profileMeta\":{\"locale\":\"vi\"}}"
```

**Response:** `200` — `{ "user": {...} }`

---

## 3. API Projects (`/api/projects`)

Tất cả endpoint dưới đây **cần JWT**.

### 3.1. GET `/api/projects` — Danh sách dự án

Trả về dự án user sở hữu hoặc được mời (collab).

```bash
curl.exe http://127.0.0.1:4000/api/projects ^
  -H "Authorization: Bearer <TOKEN>"
```

**Response:** `200` — `{ "projects": [ ... ] }`

---

### 3.2. POST `/api/projects` — Tạo dự án

**Body:**

| Field | Kiểu | Mặc định | Ghi chú |
|-------|------|----------|---------|
| `name` | string | `"Untitled Project"` | Tên dự án |
| `privacy` | `"public"` \| `"private"` | `"public"` | **Không** dùng field `status` khi tạo |

```bash
curl.exe -X POST http://127.0.0.1:4000/api/projects ^
  -H "Authorization: Bearer <TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Demo Beat\",\"privacy\":\"private\"}"
```

**Response:** `201` — `{ "project": { "id", "name", "status", "state", ... } }`

`state` mặc định: `{ "bpm": 120, "timeSig": [4,4], "masterVolume": 90, "tracks": [] }`.

---

### 3.3. GET `/api/projects/:id` — Chi tiết dự án

```bash
curl.exe http://127.0.0.1:4000/api/projects/<PROJECT_ID> ^
  -H "Authorization: Bearer <TOKEN>"
```

**Response:** `200` — `{ "project": {...}, "role": "owner" | "editor" | "viewer" }`

---

### 3.4. PUT `/api/projects/:id` — Cập nhật dự án

Cần quyền chỉnh sửa. Body tùy chọn:

| Field | Kiểu | Ghi chú |
|-------|------|---------|
| `name` | string | Đổi tên |
| `status` | `"Public"` \| `"Private"` | Privacy (chữ hoa đầu) |
| `state` | object | Trạng thái editor (BPM, tracks, clips…) |

```bash
curl.exe -X PUT http://127.0.0.1:4000/api/projects/<PROJECT_ID> ^
  -H "Authorization: Bearer <TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Renamed Beat\",\"status\":\"Public\"}"
```

**Response:** `200` — `{ "project": {...} }`

---

### 3.5. PATCH `/api/projects/:id/privacy` — Toggle Public ↔ Private

Chỉ **owner**. Không cần body — server tự đảo `Public` / `Private`.

```bash
curl.exe -X PATCH http://127.0.0.1:4000/api/projects/<PROJECT_ID>/privacy ^
  -H "Authorization: Bearer <TOKEN>"
```

**Response:** `200` — `{ "project": {...} }`

---

### 3.6. DELETE `/api/projects/:id` — Xóa dự án

Chỉ **owner**.

```bash
curl.exe -X DELETE http://127.0.0.1:4000/api/projects/<PROJECT_ID> ^
  -H "Authorization: Bearer <TOKEN>"
```

**Response:** `204` (không có body)

---

## 4. Script test nhanh (PowerShell)

Chạy tuần tự sau khi backend đã lên:

```powershell
$base = "http://127.0.0.1:4000"

# Health
Invoke-RestMethod "$base/api/health"

# Login
$login = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" `
  -ContentType "application/json" `
  -Body '{"identifier":"creator@musiclab.com","password":"demo1234"}'
$h = @{ Authorization = "Bearer $($login.token)" }

# Auth me
Invoke-RestMethod -Uri "$base/api/auth/me" -Headers $h

# List projects
Invoke-RestMethod -Uri "$base/api/projects" -Headers $h

# Create project
$p = Invoke-RestMethod -Method Post -Uri "$base/api/projects" -Headers $h `
  -ContentType "application/json" `
  -Body '{"name":"API Test Beat","privacy":"private"}'
$id = $p.project.id
Write-Host "Created project: $id"

# Get / update / toggle / delete
Invoke-RestMethod -Uri "$base/api/projects/$id" -Headers $h
Invoke-RestMethod -Method Put -Uri "$base/api/projects/$id" -Headers $h `
  -ContentType "application/json" -Body '{"name":"Updated Beat"}'
Invoke-RestMethod -Method Patch -Uri "$base/api/projects/$id/privacy" -Headers $h
Invoke-WebRequest -Method Delete -Uri "$base/api/projects/$id" -Headers $h
```

---

## 5. Test qua Frontend (minh chứng UI)

```bash
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:4000
npm run dev
```

1. Mở http://localhost:5173
2. Đăng nhập **Creator** hoặc **Admin**
3. Dashboard → **Create Project**
4. DevTools (F12) → **Network** → lọc `api/` để xem request tương ứng

---

## 6. Lỗi thường gặp

| Triệu chứng | Nguyên nhân | Cách xử lý |
|-------------|-------------|------------|
| Connection timeout | Backend chưa chạy | `cd backend && npm run dev` |
| Timeout với `localhost` | DNS/IPv6 trên Windows | Dùng `127.0.0.1` |
| `401 Unauthorized` | Thiếu hoặc hết hạn JWT | Login lại, gắn header `Authorization` |
| `Account not found` | Chưa seed DB | `npm run db:seed` |
| `400` khi tạo project | Body dùng `status` thay vì `privacy` | Dùng `"privacy":"private"` |
| `403` khi xóa/đổi privacy | Không phải owner | Đăng nhập tài khoản tạo dự án |

---

## 7. Minh chứng báo cáo (gợi ý screenshot)

| # | Nội dung |
|---|----------|
| 1 | `GET /api/health` → `{"ok":true}` |
| 2 | `POST /api/auth/login` → `200` + field `token` |
| 3 | `GET /api/projects` → danh sách dự án |
| 4 | `POST /api/projects` → `201` + `project.id` |
| 5 | Dashboard Creator có dự án vừa tạo |
| 6 | Admin login → `/admin` Overview |
