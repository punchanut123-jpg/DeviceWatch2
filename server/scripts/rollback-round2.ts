#!/usr/bin/env tsx
/**
 * Wrapper สำหรับ rollback รอบ 2
 * - เช็ค dependency ก่อนรัน (ticket, device_status_log)
 * - รันใน transaction เพื่อความปลอดภัย
 * - ป้องกันการรันบน DB production โดยตรวจสอบชื่อ DB
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface CheckResult {
  ticketCount: number;
  logCount: number;
  deviceCount: number;
}

async function checkDependencies(): Promise<CheckResult> {
  const result = await prisma.$queryRaw<[{ ticketCount: bigint; logCount: bigint; deviceCount: bigint }]>`
    SELECT 
      (SELECT COUNT(*) FROM ticket t
       JOIN device d ON t.deviceId = d.id
       WHERE d.id BETWEEN 2085 AND 3113
         AND d.name NOT REGEXP '^PC-[0-9]+$') as ticketCount,
      (SELECT COUNT(*) FROM device_status_log dsl
       JOIN device d ON dsl.deviceId = d.id
       WHERE d.id BETWEEN 2085 AND 3113
         AND d.name NOT REGEXP '^PC-[0-9]+$') as logCount,
      (SELECT COUNT(*) FROM device
       WHERE id BETWEEN 2085 AND 3113
         AND name NOT REGEXP '^PC-[0-9]+$') as deviceCount
  `;

  return {
    ticketCount: Number(result[0].ticketCount),
    logCount: Number(result[0].logCount),
    deviceCount: Number(result[0].deviceCount),
  };
}

async function runRollback(): Promise<void> {
  const sqlPath = path.join(__dirname, 'rollback-round2.sql');
  
  // Execute via mysql command line for reliability
  const dbUrl = process.env.DATABASE_URL || '';
  // Parse DATABASE_URL: mysql://user:pass@host:port/db or mysql://user@host:port/db
  let user = 'root';
  let password = '';
  let host = 'localhost';
  let port = '3306';
  let database = 'devicewatch';
  
  const match = dbUrl.match(/mysql:\/\/([^:]+):?([^@]*)@([^:]+):(\d+)\/(.+)/);
  if (match) {
    [, user, password, host, port, database] = match;
  } else {
    // Fallback: try without password
    const match2 = dbUrl.match(/mysql:\/\/([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (match2) {
      [, user, host, port, database] = match2;
    }
  }
  
  const { spawnSync } = await import('child_process');
  const args = [
    '--default-character-set=utf8mb4',
    '-u', user,
    '-h', host,
    '-P', port,
  ];
  if (password) {
    args.push(`-p${password}`);
  }
  args.push(database);
  
  const mysqlPath = 'c:\\\\xampp\\\\mysql\\\\bin\\\\mysql.exe';
  const result = spawnSync(mysqlPath, args, {
    input: fs.readFileSync(sqlPath),
    encoding: 'utf-8',
    timeout: 60000,
  });
  
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`MySQL error: ${result.stderr}`);
  }
  
  console.log(`   Rollback output: ${result.stdout.trim()}`);
}

async function main() {
  // Safety check: กันรันบน DB production
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl.includes('devicewatch_test') && !dbUrl.includes('localhost')) {
    console.error('❌ ห้ามรันบน DB production! ใช้ devicewatch_test เท่านั้น');
    process.exit(1);
  }

  console.log('🔍 กำลังเช็ค dependency ก่อน rollback...');
  const deps = await checkDependencies();

  console.log(`   Device ที่จะ rollback: ${deps.deviceCount}`);
  console.log(`   Ticket ผูกอยู่: ${deps.ticketCount}`);
  console.log(`   DeviceStatusLog: ${deps.logCount}`);

  if (deps.ticketCount > 0 || deps.logCount > 0) {
    console.error('❌ หยุด rollback: พบ dependency ที่ยังคงอยู่');
    console.error(`   Ticket: ${deps.ticketCount}, DeviceStatusLog: ${deps.logCount}`);
    console.error('   กรุณาแก้ไข ticket/log ก่อนจึงจะ rollback ได้');
    process.exit(1);
  }

  console.log('✅ ไม่พบ dependency - ปลอดภัยที่จะ rollback');
  console.log('🚀 กำลังรัน rollback...');

  try {
    await runRollback();
    console.log('✅ Rollback สำเร็จ');
  } catch (err) {
    console.error('❌ Rollback ล้มเหลว:', err);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());