import { PrismaClient, Prisma } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

export interface SnapshotDevice {
  id: number;
  name: string;
  status: string;
}

export interface SnapshotDesk {
  id: number;
  label: string;
  x: number | null;
  y: number | null;
  devices: SnapshotDevice[];
}

export interface LayoutSnapshot {
  roomName: string;
  desks: SnapshotDesk[];
  poolDevices: SnapshotDevice[];
}

/** อ่านสถานะผังห้องปัจจุบัน (ใช้ทั้งทำ summary และเก็บเป็น snapshot) */
export async function buildLayoutSnapshot(db: Db, roomId: number): Promise<LayoutSnapshot> {
  const room = await db.room.findUnique({
    where: { id: roomId },
    select: {
      name: true,
      desks: {
        orderBy: { label: 'asc' },
        select: {
          id: true,
          label: true,
          x: true,
          y: true,
          devices: {
            orderBy: { name: 'asc' },
            select: { id: true, name: true, status: true },
          },
        },
      },
      devices: {
        where: { deskId: null },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, status: true },
      },
    },
  });
  if (!room) throw new Error(`ไม่พบห้อง roomId=${roomId}`);
  return { roomName: room.name, desks: room.desks, poolDevices: room.devices };
}

const LIST_SAMPLE = 3;

function sample(items: string[]): string {
  if (items.length === 0) return '';
  const shown = items.slice(0, LIST_SAMPLE).join(', ');
  return items.length > LIST_SAMPLE ? `${shown}, … (+${items.length - LIST_SAMPLE})` : shown;
}

function joinParts(parts: string[]): string {
  return parts.length > 0 ? parts.join('; ') : 'ไม่มีการเปลี่ยนแปลง';
}

/** สรุปความเปลี่ยนแปลงเป็นข้อความสั้น ๆ เก็บลง LayoutHistory.summary */
export function buildLayoutSummary(before: LayoutSnapshot, after: LayoutSnapshot): string {
  const parts: string[] = [];

  const beforeDesks = new Map(before.desks.map((d) => [d.id, d]));
  const afterDesks = new Map(after.desks.map((d) => [d.id, d]));

  const added = after.desks.filter((d) => !beforeDesks.has(d.id)).map((d) => d.label);
  const removed = before.desks.filter((d) => !afterDesks.has(d.id)).map((d) => d.label);

  const renamed: string[] = [];
  const movedCoords: string[] = [];
  for (const d of after.desks) {
    const b = beforeDesks.get(d.id);
    if (!b) continue;
    if (b.label !== d.label) renamed.push(`${b.label} → ${d.label}`);
    if (b.x !== d.x || b.y !== d.y) movedCoords.push(d.label);
  }

  const beforeLoc = new Map<number, string>();
  for (const d of before.desks) {
    for (const dev of d.devices) beforeLoc.set(dev.id, d.label);
  }
  for (const dev of before.poolDevices) beforeLoc.set(dev.id, 'ยังไม่มีโต๊ะ');

  const assignments: string[] = [];
  for (const d of after.desks) {
    for (const dev of d.devices) {
      const prev = beforeLoc.get(dev.id);
      if (prev !== undefined && prev !== d.label) {
        assignments.push(`${dev.name}: ${prev} → ${d.label}`);
      }
    }
  }
  for (const dev of after.poolDevices) {
    const prev = beforeLoc.get(dev.id);
    if (prev !== undefined && prev !== 'ยังไม่มีโต๊ะ') {
      assignments.push(`${dev.name}: ${prev} → ยังไม่มีโต๊ะ`);
    }
  }

  if (added.length > 0) parts.push(`เพิ่ม ${added.length} โต๊ะ (${sample(added)})`);
  if (removed.length > 0) parts.push(`ลบ ${removed.length} โต๊ะ (${sample(removed)})`);
  if (movedCoords.length > 0)
    parts.push(`เปลี่ยนตำแหน่ง ${movedCoords.length} โต๊ะ (${sample(movedCoords)})`);
  if (renamed.length > 0) parts.push(`เปลี่ยนชื่อ ${renamed.length} โต๊ะ (${sample(renamed)})`);
  if (assignments.length > 0)
    parts.push(`ย้ายเครื่อง ${assignments.length} ครั้ง (${sample(assignments)})`);

  return joinParts(parts);
}

export async function recordLayoutHistory(
  db: Db,
  params: {
    roomId: number;
    action: string;
    adminName: string;
    before: LayoutSnapshot;
    after: LayoutSnapshot;
    prefix?: string;
  }
): Promise<string> {
  const diff = buildLayoutSummary(params.before, params.after);
  const summary = params.prefix ? `${params.prefix} — ${diff}` : diff;
  await db.layoutHistory.create({
    data: {
      roomId: params.roomId,
      action: params.action,
      adminName: params.adminName,
      summary,
      snapshot: params.after as unknown as Prisma.InputJsonValue,
    },
  });
  return summary;
}
