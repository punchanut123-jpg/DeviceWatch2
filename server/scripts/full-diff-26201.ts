import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Original seed.ts coordinates for Room 26201 — the source of truth
const seedCoordinates: Record<string, { posX: number; posY: number }> = {
  'PC-01': { posX: 34.5, posY: 19 },
  'PC-02': { posX: 38.5, posY: 19 },
  'PC-03': { posX: 33, posY: 25 },
  'PC-04': { posX: 37, posY: 25 },
  'PC-05': { posX: 31, posY: 32 },
  'PC-06': { posX: 35.5, posY: 32 },
  'PC-07': { posX: 28.5, posY: 40 },
  'PC-08': { posX: 33.5, posY: 40 },
  'PC-09': { posX: 25.5, posY: 50 },
  'PC-10': { posX: 31, posY: 50 },
  'PC-11': { posX: 22, posY: 61 },
  'PC-12': { posX: 27.5, posY: 61 },
  'PC-13': { posX: 18, posY: 75 },
  'PC-14': { posX: 24, posY: 75 },
  'PC-15': { posX: 45, posY: 19 },
  'PC-16': { posX: 49, posY: 19 },
  'PC-17': { posX: 44, posY: 25 },
  'PC-18': { posX: 48, posY: 25 },
  'PC-19': { posX: 43, posY: 32 },
  'PC-20': { posX: 47.5, posY: 32 },
  'PC-21': { posX: 41.5, posY: 40 },
  'PC-22': { posX: 46.5, posY: 40 },
  'PC-23': { posX: 40, posY: 50 },
  'PC-24': { posX: 45, posY: 50 },
  'PC-25': { posX: 38, posY: 61 },
  'PC-26': { posX: 43.5, posY: 61 },
  'PC-27': { posX: 35.5, posY: 75 },
  'PC-28': { posX: 41.5, posY: 75 },
  'PC-29': { posX: 56, posY: 19 },
  'PC-30': { posX: 60, posY: 19 },
  'PC-31': { posX: 56, posY: 25 },
  'PC-32': { posX: 60, posY: 25 },
  'PC-33': { posX: 55.5, posY: 32 },
  'PC-34': { posX: 60, posY: 32 },
  'PC-35': { posX: 55, posY: 40 },
  'PC-36': { posX: 59.5, posY: 40 },
  'PC-37': { posX: 54.5, posY: 50 },
  'PC-38': { posX: 59.5, posY: 50 },
  'PC-39': { posX: 54, posY: 61 },
  'PC-40': { posX: 59.5, posY: 61 },
  'PC-41': { posX: 53, posY: 75 },
  'PC-42': { posX: 59, posY: 75 },
  'PC-43': { posX: 67.5, posY: 19 },
  'PC-44': { posX: 71.5, posY: 19 },
  'PC-45': { posX: 68.5, posY: 25 },
  'PC-46': { posX: 73, posY: 25 },
  'PC-47': { posX: 69.5, posY: 32 },
  'PC-48': { posX: 74.5, posY: 32 },
  'PC-49': { posX: 70.5, posY: 40 },
  'PC-50': { posX: 76, posY: 40 },
  'PC-51': { posX: 71.5, posY: 50 },
  'PC-52': { posX: 77.5, posY: 50 },
  'PC-53': { posX: 72.5, posY: 61 },
  'PC-54': { posX: 79, posY: 61 },
  'PC-55': { posX: 73.5, posY: 75 },
  'PC-56': { posX: 80.5, posY: 75 },
  'PC-57': { posX: 39, posY: 13.5 }, // teacher desk
};

async function fullDiff() {
  const room = await prisma.room.findFirst({
    where: { name: '26201' },
    include: { devices: { orderBy: { name: 'asc' } } },
  });
  if (!room) throw new Error('Room 26201 not found');

  console.log('==========================================================');
  console.log('📋 FULL DIFF LOG: Room 26201 — 57 Devices vs Seed Coordinates');
  console.log('==========================================================');
  console.log(`Room: ${room.name} (DB ID: ${room.id})  Total devices: ${room.devices.length}`);
  console.log('----------------------------------------------------------');
  console.log('No. | Device  | DB posX    | DB posY    | Seed posX  | Seed posY  | MATCH?');
  console.log('----|---------|------------|------------|------------|------------|-------');

  let mismatches = 0;
  const sorted = room.devices.slice().sort((a, b) => {
    const numA = parseInt(a.name.replace('PC-', ''));
    const numB = parseInt(b.name.replace('PC-', ''));
    return numA - numB;
  });

  sorted.forEach((d, i) => {
    const seed = seedCoordinates[d.name];
    if (!seed) {
      console.log(`${String(i + 1).padStart(3)} | ${d.name.padEnd(7)} | ${String(d.posX).padEnd(10)} | ${String(d.posY).padEnd(10)} | (no seed) | (no seed) | ⚠️ NO SEED`);
      return;
    }
    const dbX = d.posX ?? null;
    const dbY = d.posY ?? null;
    const xMatch = dbX === seed.posX;
    const yMatch = dbY === seed.posY;
    const match = xMatch && yMatch ? '✅ MATCH' : '❌ MISMATCH';
    if (!xMatch || !yMatch) mismatches++;
    console.log(
      `${String(i + 1).padStart(3)} | ${d.name.padEnd(7)} | ${String(dbX + '%').padEnd(10)} | ${String(dbY + '%').padEnd(10)} | ${String(seed.posX + '%').padEnd(10)} | ${String(seed.posY + '%').padEnd(10)} | ${match}`
    );
  });

  console.log('----------------------------------------------------------');
  console.log(`SUMMARY: ${sorted.length - mismatches} MATCH / ${mismatches} MISMATCH out of ${sorted.length} devices`);
  if (mismatches === 0) {
    console.log('✅ ALL 57 DEVICES MATCH SEED COORDINATES 100%');
  } else {
    console.log('❌ SOME DEVICES DO NOT MATCH — NEEDS REVIEW');
  }
  console.log('==========================================================');
}

fullDiff().finally(() => prisma.$disconnect());
