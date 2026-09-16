# ── Stage 1: Build Stage ─────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# คัดลอก package files และ Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# ติดตั้ง dependencies ทั้งหมดรวมถึง devDependencies สำหรับคอมไพล์ TypeScript
RUN npm ci

# คัดลอกซอร์สโค้ดและสร้าง Prisma Client + คอมไพล์ TS
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Stage 2: Runner Stage ─────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# คัดลอกเฉพาะ package files และ Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# ติดตั้งเฉพาะ production dependencies
RUN npm ci --only=production

# คัดลอก build artifacts และ Prisma Client จาก builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
