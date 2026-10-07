// ทดสอบ endpoint ผังห้องรอบ 1 (PATCH layout + apply-layout) บนห้องชั่วคราว
// ต้องสตาร์ท server ก่อน:  npx tsx src/index.ts   (port 3000)
// รัน:  npx tsx scripts/test-layout-api.ts

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const BASE = process.env.TEST_API_BASE ?? 'http://localhost:3000';
const prisma = new PrismaClient();

const errors: string[] = [];

function check(cond: boolean, label: string, detail?: unknown) {
  if (cond) {
    console.log(`  ✅ ${label}`);
  } else {
    errors.push(label);
    console.log(`  ❌ ${label}`, detail !== undefined ? JSON.stringify(detail) : '');
  }
}

async function req(
  method: string,
  path: string,
  token: string | null,
  body?: unknown
): Promise<{ status: number; json: any }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* no body */
  }
  return { status: res.status, json };
}

async function main() {
  // 1) login
  const login = await req('POST', '/api/auth/login', null, {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
  });
  if (login.status !== 200 || !login.json?.token) {
    throw new Error(`login ไม่สำเร็จ: ${login.status} ${JSON.stringify(login.json)}`);
  }
  const token = login.json.token as string;
  check(login.json.role === 'admin', 'login ได้ role=admin');

  // 2) roomDetail ห้องจริงมี desks
  const room61 = await req('GET', '/api/buildings/rooms/61', token);
  check(room61.status === 200, 'GET rooms/61 สำเร็จ');
  check(Array.isArray(room61.json.desks) && room61.json.desks.length === 57, 'ห้อง 26201 มี 57 โต๊ะ', room61.json?.desks?.length);
  check(
    room61.json.desks?.[0]?.devices?.length === 1 &&
      typeof room61.json.desks[0].x === 'number',
    'โต๊ะแรกมีเครื่อง 1 ตัวและมีพิกัด',
    room61.json.desks?.[0]
  );

  // 3) all-rooms มี _count.desks
  const allRooms = await req('GET', '/api/buildings/all-rooms', token);
  check(
    allRooms.status === 200 && typeof allRooms.json?.[0]?._count?.desks === 'number',
    'all-rooms มี _count.desks',
    allRooms.json?.[0]?._count
  );

  // ── สร้างห้องชั่วคราวสำหรับทดสอบเขียนข้อมูล ──
  const seedRoom = await prisma.room.findUnique({ where: { id: 61 }, select: { floorId: true } });
  if (!seedRoom) throw new Error('ไม่พบห้อง 61');

  const roomA = await prisma.room.create({
    data: {
      name: 'TMP-APITEST-A',
      floorId: seedRoom.floorId,
      devices: {
        create: [
          { name: 'PC-T1', status: 'normal' },
          { name: 'PC-T2', status: 'normal' },
          { name: 'PC-T3', status: 'broken' },
        ],
      },
    },
    include: { devices: { orderBy: { name: 'asc' } } },
  });
  const roomB = await prisma.room.create({
    data: {
      name: 'TMP-APITEST-B',
      floorId: seedRoom.floorId,
      devices: {
        create: [
          { name: 'PC-T1', status: 'normal' },
          { name: 'PC-T9', status: 'normal' },
        ],
      },
    },
    include: { devices: { orderBy: { name: 'asc' } } },
  });

  // ห้อง B มีผังพร้อมอยู่แล้ว (เป็นห้องต้นทางสำหรับ apply-layout)
  const bDesk1 = await prisma.desk.create({
    data: { roomId: roomB.id, label: 'โต๊ะ 01', x: 10, y: 10 },
  });
  const bDesk2 = await prisma.desk.create({
    data: { roomId: roomB.id, label: 'โต๊ะ 02', x: null, y: null },
  });
  await prisma.device.update({
    where: { id: roomB.devices.find((d) => d.name === 'PC-T1')!.id },
    data: { deskId: bDesk1.id },
  });
  await prisma.device.update({
    where: { id: roomB.devices.find((d) => d.name === 'PC-T9')!.id },
    data: { deskId: bDesk2.id },
  });

  try {
    // 4) PATCH layout: สร้างโต๊ะ 2 + แก้ + ผูกเครื่อง (โต๊ะ A ยังไม่มีโต๊ะเลย)
    const patch1 = await req('PATCH', `/api/admin/rooms/${roomA.id}/layout`, token, {
      desks: [
        { label: 'โต๊ะ 01', x: 20, y: 30 },
        { label: 'โต๊ะ 02', x: null, y: null },
      ],
      assignments: [
        { deviceId: roomA.devices[0].id, deskIndex: 0 },
        { deviceId: roomA.devices[1].id, deskIndex: 0 },
        { deviceId: roomA.devices[2].id, deskIndex: 1 },
      ],
    });
    check(patch1.status === 200 && patch1.json.success, 'PATCH layout สร้างโต๊ะ 2 โต๊ะ', patch1.json);
    check(patch1.json.deskCount === 2 && patch1.json.poolCount === 0, 'deskCount=2 poolCount=0', patch1.json);
    check(typeof patch1.json.summary === 'string' && patch1.json.summary.includes('เพิ่ม 2 โต๊ะ'), 'summary รายงานเพิ่มโต๊ะ', patch1.json.summary);

    // 5) แก้ตำแหน่ง/ชื่อ + ลบโต๊ะ + ปล่อยเครื่องเป็น pool
    const current = await req('GET', `/api/buildings/rooms/${roomA.id}`, token);
    const deskIds = current.json.desks.map((d: any) => d.id);
    const patch2 = await req('PATCH', `/api/admin/rooms/${roomA.id}/layout`, token, {
      desks: [{ id: deskIds[0], label: 'โต๊ะ ๑', x: 50, y: 60 }],
      deleteIds: [deskIds[1]],
      assignments: [
        { deviceId: roomA.devices[0].id, deskIndex: 0 },
        { deviceId: roomA.devices[1].id, deskIndex: null },
        { deviceId: roomA.devices[2].id, deskIndex: null },
      ],
    });
    check(patch2.status === 200 && patch2.json.deskCount === 1, 'PATCH แก้+ลบโต๊ะ เหลือ 1', patch2.json);
    check(patch2.json.poolCount === 2, 'เครื่อง 2 ตัวเป็น pool', patch2.json);

    // 6) validate ปฏิเสธ label ซ้ำ
    const dup = await req('PATCH', `/api/admin/rooms/${roomA.id}/layout`, token, {
      desks: [
        { id: deskIds[0], label: 'โต๊ะ X', x: 10, y: 10 },
        { label: 'โต๊ะ X', x: null, y: null },
      ],
    });
    check(dup.status === 400, 'label ซ้ำถูกปฏิเสธ (400)', dup.json);

    // 7) validate พิกัด null ไม่เป็นคู่
    const badPos = await req('PATCH', `/api/admin/rooms/${roomA.id}/layout`, token, {
      desks: [{ id: deskIds[0], label: 'โต๊ะ ๑', x: 10, y: null }],
    });
    check(badPos.status === 400, 'x/y ไม่เป็นคู่ถูกปฏิเสธ (400)', badPos.json);

    // 8) apply-layout: preview (ไม่เขียน)
    const preview = await req('POST', `/api/admin/rooms/${roomA.id}/apply-layout`, token, {
      sourceRoomId: roomB.id,
    });
    check(preview.status === 200 && preview.json.preview, 'apply-layout คืน preview', preview.json);
    check(preview.json.preview?.sourceRoomName === 'TMP-APITEST-B', 'preview ชื่อห้องต้นทาง', preview.json.preview);
    check(preview.json.preview?.matchedByName === 1, 'จับคู่ชื่อได้ 1 (PC-T1)', preview.json.preview);
    check(preview.json.preview?.assignedByOrder === 1, 'จับตามลำดับ 1', preview.json.preview);
    check(preview.json.preview?.toPool === 1, 'ค้าง pool 1 (PC-T3)', preview.json.preview);
    check(preview.json.preview?.desksToCreate === 2, 'จะสร้างโต๊ะ 2', preview.json.preview);

    const afterPreview = await req('GET', `/api/buildings/rooms/${roomA.id}`, token);
    check(afterPreview.json.desks.length === 1, 'preview ไม่เขียนข้อมูล (โต๊ะยัง 1)', afterPreview.json.desks.length);

    // 9) apply-layout: confirm
    const applied = await req('POST', `/api/admin/rooms/${roomA.id}/apply-layout`, token, {
      sourceRoomId: roomB.id,
      confirm: true,
    });
    check(applied.status === 200 && applied.json.success, 'apply-layout confirm สำเร็จ', applied.json);

    const afterApply = await req('GET', `/api/buildings/rooms/${roomA.id}`, token);
    const desks = afterApply.json.desks;
    check(desks.length === 2, 'หลัง apply มีโต๊ะ 2', desks.length);
    check(desks[0].devices.length === 1 && desks[1].devices.length === 1, 'โต๊ะละ 1 เครื่อง', desks.map((d: any) => d.devices.length));
    const names = desks.flatMap((d: any) => d.devices.map((x: any) => x.name)).sort();
    check(JSON.stringify(names) === JSON.stringify(['PC-T1', 'PC-T2']), 'เครื่องที่อยู่บนโต๊ะ = PC-T1, PC-T2', names);
    check(names.includes('PC-T1'), 'PC-T1 จับคู่ชื่อข้ามห้องได้');
    const poolNames = afterApply.json.devices.filter((d: any) => desks.every((x: any) => !x.devices.some((y: any) => y.id === d.id))).map((d: any) => d.name);
    check(JSON.stringify(poolNames) === JSON.stringify(['PC-T3']), 'PC-T3 ค้าง pool', poolNames);

    // 10) มี LayoutHistory ครบ
    const history = await prisma.layoutHistory.findMany({
      where: { roomId: roomA.id },
      orderBy: { createdAt: 'asc' },
    });
    check(history.length === 3, 'มี history 3 รายการ (save, save, apply)', history.length);
    check(history.some((h) => h.action === 'save_layout'), 'มี action=save_layout');
    check(history.some((h) => h.action === 'apply_layout'), 'มี action=apply_layout');
    check(history.every((h) => h.adminName === process.env.ADMIN_USERNAME), 'adminName ถูกต้องทุกแถว');
    check(history.every((h) => h.summary.length > 0), 'summary ไม่ว่าง');
    const snap = history[history.length - 1].snapshot as any;
    check(Array.isArray(snap.desks) && snap.desks.length === 2, 'snapshot เก็บ after-state โต๊ะ 2', snap.desks?.length);
    check(snap.roomName === 'TMP-APITEST-A', 'snapshot มีชื่อห้อง');
  } finally {
    // ── ล้างห้องทดสอบ ──
    const tmpRooms = await prisma.room.findMany({
      where: { name: { startsWith: 'TMP-APITEST' } },
      select: { id: true },
    });
    for (const r of tmpRooms) {
      await prisma.layoutHistory.deleteMany({ where: { roomId: r.id } });
      await prisma.device.deleteMany({ where: { roomId: r.id } });
      await prisma.desk.deleteMany({ where: { roomId: r.id } });
      await prisma.room.delete({ where: { id: r.id } });
    }
    console.log(`🧹 ล้างห้องทดสอบ ${tmpRooms.length} ห้องแล้ว`);
  }

  console.log('');
  if (errors.length > 0) {
    console.error(`❌ ล้มเหลว ${errors.length} ข้อ:`);
    errors.forEach((e) => console.error(`   - ${e}`));
    process.exitCode = 1;
  } else {
    console.log('✅ ผ่านทุกข้อ');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
