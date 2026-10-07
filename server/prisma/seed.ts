/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import { generatePositions } from './positions';


const prisma = new PrismaClient();

// Device name generator
function makeDevices(count: number, withPositions = false) {
  const positions = withPositions ? generatePositions(count) : [];
  return Array.from({ length: count }, (_, i) => ({
    name: `PC-${String(i + 1).padStart(2, '0')}`,
    posX: withPositions ? positions[i].posX : null,
    posY: withPositions ? positions[i].posY : null,
    status: 'normal',
  }));
}

async function main() {
  console.log('🌱 Seeding database...');

  // Clear in order (children first)
  await prisma.ticket.deleteMany();
  await prisma.device.deleteMany();
  await prisma.desk.deleteMany();
  await prisma.layoutHistory.deleteMany();
  await prisma.room.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.building.deleteMany();

  await prisma.building.create({
    data: {
      name: 'อาคารคณะเทคโนโลยีสารสนเทศ',
      floors: {
        create: [
          // ── ชั้น 2 ──────────────────────────────────────────
          {
            number: 2,
            rooms: {
              create: [
                {
                  name: '26201',
                  lineUserId: 'Uafdc29a4602455f7cd66cacb080f05c2',
                  devices: { create: makeDevices(57, true) }, // Map View
                },
                {
                  name: '26202',
                  lineUserId: 'Uafdc29a4602455f7cd66cacb080f05c2',
                  devices: { create: makeDevices(31) },
                },
                {
                  name: '26203',
                  lineUserId: 'Uafdc29a4602455f7cd66cacb080f05c2',
                  devices: { create: makeDevices(29) },
                },
                {
                  name: '26204',
                  lineUserId: 'Uafdc29a4602455f7cd66cacb080f05c2',
                  devices: { create: makeDevices(4) },
                },
                {
                  name: '26205',
                  lineUserId: 'Uafdc29a4602455f7cd66cacb080f05c2',
                  devices: { create: makeDevices(1) },
                },
                {
                  name: '26206',
                  lineUserId: 'Uafdc29a4602455f7cd66cacb080f05c2',
                  devices: { create: makeDevices(29) },
                },
              ],
            },
          },
          // ── ชั้น 4 ──────────────────────────────────────────
          {
            number: 4,
            rooms: {
              create: [
                {
                  name: '26402',
                  lineUserId: 'Uafdc29a4602455f7cd66cacb080f05c2',
                  devices: { create: makeDevices(36) },
                },
                {
                  name: '26403',
                  lineUserId: 'Uafdc29a4602455f7cd66cacb080f05c2',
                  devices: { create: makeDevices(38) },
                },
                {
                  name: '26404',
                  lineUserId: 'Uafdc29a4602455f7cd66cacb080f05c2',
                  devices: { create: makeDevices(36) },
                },
                {
                  name: '26406',
                  lineUserId: 'Uafdc29a4602455f7cd66cacb080f05c2',
                  devices: { create: makeDevices(20) },
                },
              ],
            },
          },
          // ── ชั้น 5 ──────────────────────────────────────────
          {
            number: 5,
            rooms: {
              create: [
                {
                  name: '26502',
                  lineUserId: 'Uafdc29a4602455f7cd66cacb080f05c2',
                  devices: { create: makeDevices(31) },
                },
                {
                  name: '26503',
                  lineUserId: 'Uafdc29a4602455f7cd66cacb080f05c2',
                  devices: { create: makeDevices(31) },
                },
              ],
            },
          },
        ],
      },
    },
  });

  // Summary
  const deviceCount = await prisma.device.count();
  const roomCount = await prisma.room.count();
  console.log(`✅ Seeded: ${roomCount} rooms, ${deviceCount} devices`);
  console.log('');
  console.log('📝 lineUserId: Uafdc29a4602455f7cd66cacb080f05c2 ถูกตั้งค่าทุกห้องแล้ว');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
