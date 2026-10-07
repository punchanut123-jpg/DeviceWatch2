// สร้างโต๊ะ (Desk) จากเครื่อง (Device) — รอบ 1 ของระบบจัดผังห้อง
//
// รัน dry-run (ค่าเริ่มต้น ไม่เขียนอะไรทั้งสิ้น):
//   npx tsx scripts/migrate-to-desks.ts
//
// เขียนจริง:
//   npx tsx scripts/migrate-to-desks.ts --apply
//
// ใช้ผังมือของ seed สำหรับห้องที่ระบุ (นับจาก generatePositions):
//   npx tsx scripts/migrate-to-desks.ts --apply --seed-rooms=26201
//
// รันซ้ำได้ (idempotent): ห้องที่มีโต๊ะอยู่แล้วจะถูกข้าม — ไม่สร้างซ้ำ
// สำรองก่อนเสมอ:  powershell -ExecutionPolicy Bypass -File scripts\backup-db.ps1

import { PrismaClient } from '@prisma/client';
import { generatePositions } from '../prisma/positions';

const prisma = new PrismaClient();

function deskLabel(index: number): string {
  return `โต๊ะ ${String(index + 1).padStart(2, '0')}`;
}

interface RoomPlan {
  roomId: number;
  roomName: string;
  deviceCount: number;
  placedFromDevice: number;
  placedFromSeed: number;
  unplaced: number;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const seedArg = process.argv.find((a) => a.startsWith('--seed-rooms='));
  const seedRooms = seedArg
    ? seedArg.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const rooms = await prisma.room.findMany({
    orderBy: [{ floor: { number: 'asc' } }, { name: 'asc' }],
    include: {
      devices: { orderBy: { name: 'asc' } },
      _count: { select: { desks: true } },
    },
  });

  const plans: RoomPlan[] = [];
  const skipped: Array<{ roomId: number; roomName: string; desks: number; poolDevices: number }> = [];
  let totalDesksToCreate = 0;

  for (const room of rooms) {
    if (room._count.desks > 0) {
      const poolDevices = await prisma.device.count({
        where: { roomId: room.id, deskId: null },
      });
      skipped.push({
        roomId: room.id,
        roomName: room.name,
        desks: room._count.desks,
        poolDevices,
      });
      continue;
    }

    if (room.devices.length === 0) {
      plans.push({
        roomId: room.id,
        roomName: room.name,
        deviceCount: 0,
        placedFromDevice: 0,
        placedFromSeed: 0,
        unplaced: 0,
      });
      continue;
    }

    const useSeed = seedRooms.includes(room.name);
    const seedPositions = useSeed ? generatePositions(room.devices.length) : null;

    let placedFromDevice = 0;
    let placedFromSeed = 0;
    let unplaced = 0;

    room.devices.forEach((dev, i) => {
      const hasDevicePos =
        typeof dev.posX === 'number' && typeof dev.posY === 'number';
      const hasSeedPos = !!seedPositions?.[i];
      if (hasDevicePos) placedFromDevice += 1;
      else if (hasSeedPos) placedFromSeed += 1;
      else unplaced += 1;
    });

    totalDesksToCreate += room.devices.length;
    plans.push({
      roomId: room.id,
      roomName: room.name,
      deviceCount: room.devices.length,
      placedFromDevice,
      placedFromSeed,
      unplaced,
    });

    if (apply) {
      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < room.devices.length; i++) {
          const dev = room.devices[i];
          const seedPos = seedPositions?.[i];
          const x =
            typeof dev.posX === 'number' && typeof dev.posY === 'number'
              ? dev.posX
              : seedPos
              ? seedPos.posX
              : null;
          const y =
            typeof dev.posX === 'number' && typeof dev.posY === 'number'
              ? dev.posY
              : seedPos
              ? seedPos.posY
              : null;

          const desk = await tx.desk.create({
            data: { roomId: room.id, label: deskLabel(i), x, y },
          });
          await tx.device.update({
            where: { id: dev.id },
            data: { deskId: desk.id },
          });
        }
      });
    }
  }

  console.log('');
  console.log(apply ? '✅ APPLY — เขียนข้อมูลแล้ว' : '🔍 DRY-RUN — ยังไม่เขียนอะไร (ใช้ --apply เพื่อเขียนจริง)');
  console.log('');
  console.log('ห้องที่จะสร้างโต๊ะ:');
  console.table(
    plans.map((p) => ({
      roomId: p.roomId,
      ห้อง: p.roomName,
      เครื่อง: p.deviceCount,
      'พิกัดจากเดิม': p.placedFromDevice,
      'พิกัดจากผังมือ': p.placedFromSeed,
      'ยังไม่วาง (NULL)': p.unplaced,
    }))
  );

  if (skipped.length > 0) {
    console.log('ห้องที่ข้าม (มีโต๊ะอยู่แล้ว — idempotent):');
    console.table(
      skipped.map((s) => ({
        roomId: s.roomId,
        ห้อง: s.roomName,
        โต๊ะ: s.desks,
        'เครื่องไม่มีโต๊ะ': s.poolDevices,
      }))
    );
  }

  console.log(`รวมโต๊ะที่${apply ? 'สร้างแล้ว' : 'จะสร้าง'}: ${totalDesksToCreate}`);
  if (skipped.some((s) => s.poolDevices > 0)) {
    console.log('⚠️ มีเครื่องที่ยังไม่มีโต๊ะในห้องที่ migrate แล้ว — จัดในหน้าแก้ผังห้องได้เลย');
  }
  if (!apply) {
    console.log('');
    console.log('คำสั่งเขียนจริง:  npx tsx scripts/migrate-to-desks.ts --apply');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
