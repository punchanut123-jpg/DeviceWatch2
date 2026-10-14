// แปลงเครื่อง (Device) เดิมให้เป็นชิ้นส่วน (component) — รอบ 2 ของระบบจัดผังห้อง
//
// เครื่องเดิม 1 แถว จะกลายเป็นชุดอุปกรณ์บนโต๊ะเดียวกัน:
//   - ห้องมาตรฐาน: เครื่องเดิม = เคส + สร้าง จอ / เมาส์ / คีย์บอร์ด
//   - ห้อง AIO:    เครื่องเดิม = AIO + สร้าง เมาส์ / คีย์บอร์ด
// ชิ้นส่วนที่สร้างใหม่ inherits สถานะ/โต๊ะ/ห้อง ของเครื่องต้นทาง
//
// รัน dry-run (ค่าเริ่มต้น ไม่เขียนอะไรทั้งสิ้น):
//   npx tsx scripts/migrate-to-components.ts
//
// เขียนจริง:
//   npx tsx scripts/migrate-to-components.ts --apply
//
// ระบุห้อง AIO (คั่นด้วย , — ใส่ชื่อห้องหรือ id ก็ได้):
//   npx tsx scripts/migrate-to-components.ts --apply --aio-rooms=26205,26206
//
// รันซ้ำได้ (idempotent): ชิ้นส่วนที่สร้างแล้วจะถูกข้าม — ไม่สร้างซ้ำ
// ย้อนกลับ:  scripts/rollback-round2.sql
// สำรองก่อนเสมอ:  powershell -ExecutionPolicy Bypass -File scripts\backup-db.ps1

import { PrismaClient } from '@prisma/client';
import {
  DEVICE_TYPE_LABELS,
  PRESETS,
  type DeviceType,
} from '../src/constants/layoutRules';

const prisma = new PrismaClient();

/** ชื่อชิ้นส่วนที่สร้างจากสคริปต์นี้ลงท้ายด้วย " (จอ)" / " (เมาส์)" ... */
const COMPONENT_SUFFIX = / \((จอ|เมาส์|คีย์บอร์ด|AIO|เคส)\)$/;

interface RoomPlan {
  roomId: number;
  roomName: string;
  preset: 'standard' | 'aio';
  baseDevices: number;
  alreadySplit: number;
  toUpdateType: number;
  toCreate: number;
}

function companionName(baseName: string, type: DeviceType): string {
  return `${baseName} (${DEVICE_TYPE_LABELS[type]})`;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const aioArg = process.argv.find((a) => a.startsWith('--aio-rooms='));
  const aioRooms = new Set(
    aioArg
      ? aioArg
          .split('=')[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []
  );

  const rooms = await prisma.room.findMany({
    orderBy: [{ floor: { number: 'asc' } }, { name: 'asc' }],
    include: { devices: { orderBy: { name: 'asc' } } },
  });

  const plans: RoomPlan[] = [];
  let totalToUpdate = 0;
  let totalToCreate = 0;
  let totalAlreadySplit = 0;
  const warnings: string[] = [];

  for (const room of rooms) {
    const isAioRoom = aioRooms.has(room.name) || aioRooms.has(String(room.id));
    const presetKey = isAioRoom ? 'aio' : 'standard';
    const baseType: DeviceType = isAioRoom ? 'aio' : 'case';
    // ชิ้นที่ต้องสร้าง = preset - ชิ้นหลักที่ใช้แทนเครื่องเดิม
    const createTypes = PRESETS[presetKey].filter((t) => t !== baseType);

    // เครื่องต้นทาง = ไม่ใช่ชิ้นที่สคริปต์นี้เคยสร้าง (ไม่มี suffix)
    const baseDevices = room.devices.filter((d) => !COMPONENT_SUFFIX.test(d.name));
    // ชิ้นที่สร้างไว้แล้ว (มี suffix ของเครื่องในห้องนี้)
    const existingNames = new Set(room.devices.map((d) => d.name));

    let toUpdateType = 0;
    let toCreate = 0;
    let alreadySplit = 0;

    const creates: Array<{
      data: { name: string; deviceType: string; status: string; roomId: number; deskId: number | null };
    }> = [];

    for (const dev of baseDevices) {
      const hasAny = createTypes.some((t) => existingNames.has(companionName(dev.name, t)));
      if (hasAny && dev.deviceType === baseType) {
        alreadySplit += 1;
        continue;
      }
      if (dev.deviceType !== baseType) toUpdateType += 1;

      for (const type of createTypes) {
        const name = companionName(dev.name, type);
        if (existingNames.has(name)) continue; // เคยสร้างแล้ว (idempotent)
        if (room.devices.some((d) => d.name === name)) {
          warnings.push(`ชื่อซ้ำข้ามห้องไม่ควรเกิด: ${name} ในห้อง ${room.name}`);
          continue;
        }
        creates.push({
          data: {
            name,
            deviceType: type,
            status: dev.status,
            roomId: room.id,
            deskId: dev.deskId,
          },
        });
        existingNames.add(name);
      }
    }

    plans.push({
      roomId: room.id,
      roomName: room.name,
      preset: presetKey,
      baseDevices: baseDevices.length,
      alreadySplit,
      toUpdateType,
      toCreate: creates.length,
    });

    totalToUpdate += toUpdateType;
    totalToCreate += creates.length;
    totalAlreadySplit += alreadySplit;

    if (apply && (toUpdateType > 0 || creates.length > 0)) {
      await prisma.$transaction(async (tx) => {
        for (const dev of baseDevices) {
          if (dev.deviceType !== baseType) {
            await tx.device.update({
              where: { id: dev.id },
              data: { deviceType: baseType },
            });
          }
        }
        for (const c of creates) {
          await tx.device.create(c);
        }
      });
    }
  }

  console.log('');
  console.log(
    apply
      ? '✅ APPLY — เขียนข้อมูลแล้ว'
      : '🔍 DRY-RUN — ยังไม่เขียนอะไร (ใช้ --apply เพื่อเขียนจริง)'
  );
  if (aioRooms.size > 0) {
    console.log(`ห้อง AIO ที่ระบุ: ${[...aioRooms].join(', ')}`);
  }
  console.log('');
  console.log('แผนรายห้อง:');
  console.table(
    plans.map((p) => ({
      roomId: p.roomId,
      ห้อง: p.roomName,
      preset: p.preset,
      'เครื่องเดิม': p.baseDevices,
      'แยกแล้ว (ข้าม)': p.alreadySplit,
      'แก้ deviceType': p.toUpdateType,
      'ชิ้นที่จะสร้าง': p.toCreate,
    }))
  );

  if (warnings.length > 0) {
    console.log('⚠️ คำเตือน:');
    warnings.forEach((w) => console.log(`  - ${w}`));
  }

  console.log(
    `รวม: แก้ deviceType ${totalToUpdate} แถว, สร้างชิ้นส่วน ${totalToCreate} แถว, ข้าม (แยกแล้ว) ${totalAlreadySplit} เครื่อง`
  );
  if (totalToCreate === 0 && totalToUpdate === 0) {
    console.log('✅ ข้อมูลเป็นชิ้นส่วนครบแล้ว — รันซ้ำได้อย่างปลอดภัย');
  }
  if (!apply && totalToCreate + totalToUpdate > 0) {
    console.log('');
    console.log('คำสั่งเขียนจริง:  npx tsx scripts/migrate-to-components.ts --apply' +
      (aioRooms.size > 0 ? ` --aio-rooms=${[...aioRooms].join(',')}` : ''));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
