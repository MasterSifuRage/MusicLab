# MusicLab — single image for same-origin deploy (Render, VPS)
# Serves React SPA + Express API + WebSocket on one port.

# --- Frontend (same-origin: no VITE_API_URL) ---
FROM node:22-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
ENV VITE_USE_API=true
ENV VITE_API_URL=
RUN npm run build

# --- Backend ---
FROM node:22-alpine AS backend-build
WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

# --- Runtime ---
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV SERVE_SPA=true
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=backend-build /app/dist ./dist
COPY backend/src/db/schema.sql ./dist/db/schema.sql
COPY --from=frontend-build /frontend/dist ./public
RUN mkdir -p uploads renders
EXPOSE 4000
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
