#!/bin/bash
# ────────────────────────────────────────────────────────────
# DeviceWatch — Automated MySQL Database Backup Script
# ────────────────────────────────────────────────────────────

# การตั้งค่า (ปรับตามสภาพแวดล้อมจริง)
BACKUP_DIR="/var/backups/devicewatch"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/devicewatch_backup_${TIMESTAMP}.sql.gz"

DB_USER="${MYSQL_USER:-devicewatch_user}"
DB_PASS="${MYSQL_PASSWORD:-devicewatch_pass123}"
DB_NAME="${MYSQL_DATABASE:-devicewatch}"
DB_HOST="${MYSQL_HOST:-localhost}"

# สร้างโฟลเดอร์สำรองข้อมูลถ้ายังไม่มี
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting MySQL backup for database: ${DB_NAME}..."

# รัน mysqldump และบีบอัดด้วย gzip
mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" --single-transaction --routines --triggers "$DB_NAME" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "[$(date)] ✅ Backup successfully created: ${BACKUP_FILE}"
else
  echo "[$(date)] ❌ Backup failed!"
  exit 1
fi

# ลบไฟล์ Backup เก่าที่เกิน 30 วันอัตโนมัติ (Retention 30 days)
find "$BACKUP_DIR" -type f -name "devicewatch_backup_*.sql.gz" -mtime +30 -exec rm {} \;
echo "[$(date)] 🧹 Cleaned up backups older than 30 days."
