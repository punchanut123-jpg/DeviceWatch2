# ── Stage 1: Build Stage ─────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Serve Stage ─────────────────────────────────────
FROM nginx:alpine AS runner

# คัดลอก static files จาก build stage ไปยัง Nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# คัดลอก Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
