# สำรองฐานข้อมูลก่อนรัน migration / สคริปต์ที่แก้ข้อมูล
# ใช้:  powershell -ExecutionPolicy Bypass -File scripts\backup-db.ps1
# ผลลัพธ์: server/backups/devicewatch-YYYYMMDD-HHmmss.sql

param(
  [string]$DbName = "devicewatch",
  [string]$MysqlBin = "c:\xampp\mysql\bin",
  [string]$OutDir = (Join-Path $PSScriptRoot "..\backups")
)

$ErrorActionPreference = "Stop"

$mysqldump = Join-Path $MysqlBin "mysqldump.exe"
if (-not (Test-Path $mysqldump)) {
  Write-Error "ไม่พบ mysqldump: $mysqldump"
}

if (-not (Test-Path $OutDir)) {
  New-Item -ItemType Directory -Path $OutDir | Out-Null
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$file = Join-Path $OutDir "$DbName-$stamp.sql"

& $mysqldump -u root --routines --triggers $DbName | Out-File -FilePath $file -Encoding utf8
if ($LASTEXITCODE -ne 0) {
  Write-Error "mysqldump ล้มเหลว (exit $LASTEXITCODE)"
}

$size = (Get-Item $File).Length
Write-Host "✅ สำรองฐานข้อมูลเรียบร้อย: $file ($([math]::Round($size/1KB,1)) KB)"
Write-Host "   ใช้ย้อนกลับ:  & `"$MysqlBin\mysql.exe`" -u root $DbName < `"$file`""
