#!/usr/bin/env tsx
/**
 * สคริปต์สร้าง DB ทดสอบ (devicewatch_test) จาก dump production
 * - ปฏิเสธถ้า DB ปลายทางตรงกับ DB ใน .env
 * - ใช้ --single-transaction ตอน dump
 * - มีวิธีรัน server ตัวที่สองที่ชี้ DB ทดสอบ
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync, spawn } from 'child_process';

const prisma = new PrismaClient();

async function main() {
  const dbUrl = process.env.DATABASE_URL || '';
  
  // Parse DATABASE_URL
  const match = dbUrl.match(/mysql:\/\/([^:]+):?([^@]*)@([^:]+):(\d+)\/(.+)/);
  if (!match) {
    console.error('❌ DATABASE_URL format ไม่ถูกต้อง');
    process.exit(1);
  }
  const [, user, password, host, port, prodDbName] = match;

  // Safety check: กัน restore ทับ DB production
  const testDbName = 'devicewatch_test';
  if (prodDbName === testDbName) {
    console.error(`❌ ห้ามใช้ DB production (${prodDbName}) เป็น target!`);
    process.exit(1);
  }

  // ตรวจสอบ host + db name
  const envUrl = new URL(dbUrl);
  if (envUrl.hostname === 'localhost' && envUrl.pathname.slice(1) === testDbName) {
    console.error(`❌ .env ชี้ไปที่ ${testDbName} แล้ว - ห้ามรันสคริปต์นี้!`);
    process.exit(1);
  }

  console.log(`📋 ข้อมูล:`);
  console.log(`   Production DB: ${prodDbName} @ ${host}:${port}`);
  console.log(`   Test DB: ${testDbName} @ ${host}:${port}`);

  // 1. Dump production DB with --single-transaction
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const dumpFile = path.join(__dirname, `../backup_${prodDbName}_${timestamp}.sql`);
  
  console.log(`\n📦 กำลัง dump ${prodDbName}...`);
  const dumpArgs = [
    '--single-transaction',
    '--default-character-set=utf8mb4',
    '-u', 'root',
    prodDbName,
  ];
  
  const dumpResult = spawnSync('c:\\xampp\\mysql\\bin\\mysqldump.exe', dumpArgs, {
    stdio: ['pipe', fs.openSync(dumpFile, 'w'), 'pipe'],
    timeout: 120000,
  });
  
  if (dumpResult.error || dumpResult.status !== 0) {
    console.error('❌ Dump ล้มเหลว:', dumpResult.error?.message || dumpResult.stderr?.toString());
    process.exit(1);
  }
  
  const dumpSize = fs.statSync(dumpFile).size;
  console.log(`✅ Dump เสร็จ: ${dumpFile} (${(dumpSize/1024/1024).toFixed(2)} MB)`);

  // 2. Create test DB
  console.log(`\n🗄️  กำลังสร้าง ${testDbName}...`);
  const testPrisma = new PrismaClient({
    datasources: { db: { url: `mysql://${user}:${password}@${host}:${port}/${testDbName}` } },
  });
  
  try {
    await testPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${testDbName}\``);
    await testPrisma.$executeRawUnsafe(`CREATE DATABASE \`${testDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ สร้าง ${testDbName} เรียบร้อย`);
  } finally {
    await testPrisma.$disconnect();
  }

  // 3. Restore to test DB
  console.log(`\n📥 กำลัง restore ไปยัง ${testDbName}...`);
  const restoreResult = spawnSync('c:\\xampp\\mysql\\bin\\mysql.exe', [
    '--default-character-set=utf8mb4',
    '-u', 'root',
    '-h', host,
    '-P', port,
    testDbName,
  ], {
    input: fs.readFileSync(dumpFile),
    encoding: 'utf-8',
    timeout: 180000,
  });
  
  if (restoreResult.error) {
    console.error('❌ Restore ล้มเหลว:', restoreResult.error);
    process.exit(1);
  }
  if (restoreResult.status !== 0) {
    console.error('❌ Restore ล้มเหลว:', restoreResult.stderr?.toString());
    process.exit(1);
  }
  console.log(`✅ Restore เสร็จสมบูรณ์`);

  // 3.5. Apply migrations to test DB
  console.log(`\n🔧 กำลัง apply migrations...`);
  const migrateResult = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: `mysql://${user}:${password}@${host}:${port}/${testDbName}` },
    cwd: path.join(__dirname, '..'),
    encoding: 'utf-8',
    stdio: 'pipe',
    timeout: 120000,
    shell: true,
  });
  
  if (migrateResult.status !== 0) {
    console.error('❌ Migrate ล้มเหลว');
    console.log('stdout:', migrateResult.stdout?.toString());
    console.log('stderr:', migrateResult.stderr?.toString());
    process.exit(1);
  }
  console.log(`✅ Migrations applied`);
  
  // Verify test DB
  console.log(`\n🔍 ตรวจสอบ test DB...`);
  const testPrisma2 = new PrismaClient({
    datasources: { db: { url: `mysql://${user}:${password}@${host}:${port}/${testDbName}` } },
  });
  try {
    const deviceCount = await testPrisma2.device.count();
    const deskCount = await testPrisma2.desk.count();
    console.log(`✅ Test DB verified: ${deviceCount} devices, ${deskCount} desks`);
  } finally {
    await testPrisma2.$disconnect();
  }

  // 4. Print instructions for running test server
  console.log(`\n✅ === เสร็จสิ้น ===`);
  console.log(`Test DB พร้อมใช้งาน: ${testDbName}`);
  console.log(`\n📋 วิธีรัน server ทดสอบ (port 3001):`);
  console.log(`   $env:DATABASE_URL = "mysql://${user}:${password}@${host}:${port}/${testDbName}"`);
  console.log(`   $env:PORT = "3001"`);
  console.log(`   npx tsx src/index.ts`);
  console.log(`\n📋 วิธีรันเทสต์:`);
  console.log(`   $env:DATABASE_URL = "mysql://${user}:${password}@${host}:${port}/${testDbName}"`);
  console.log(`   npx tsx scripts/test-layout-api.ts`);
  console.log(`\n📁 Dump file: ${dumpFile}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());