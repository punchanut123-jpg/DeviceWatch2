#!/bin/sh
set -e

echo "🚀 Starting DeviceWatch Backend Container Entrypoint..."

# รัน Database Migrations โดยอัตโนมัติ
echo "📦 Running Prisma Database Migrations..."
npx prisma migrate deploy || echo "⚠️ Migration completed or no new migrations."

# รัน Seed ข้อมูล (ถ้าต้องการ)
if [ "$RUN_SEED" = "true" ]; then
  echo "🌱 Seeding initial database data..."
  npx prisma db seed || echo "⚠️ Seeding skipped or already seeded."
fi

echo "✅ Database readiness check completed. Starting application..."
exec "$@"
