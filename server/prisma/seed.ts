import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Generate grid positions for Map View (used for room 26201)
function generatePositions(count: number): { posX: number; posY: number }[] {
  if (count === 57) {
    const rowY = [19.0, 25.0, 32.0, 40.0, 50.0, 61.0, 75.0];
    const colX = [
      // Column 1 (Left desk)
      [
        [34.5, 38.5],
        [33.0, 37.0],
        [31.0, 35.5],
        [28.5, 33.5],
        [25.5, 31.0],
        [22.0, 27.5],
        [18.0, 24.0],
      ],
      // Column 2 (Middle-Left desk)
      [
        [45.0, 49.0],
        [44.0, 48.0],
        [43.0, 47.5],
        [41.5, 46.5],
        [40.0, 45.0],
        [38.0, 43.5],
        [35.5, 41.5],
      ],
      // Column 3 (Middle-Right desk)
      [
        [56.0, 60.0],
        [56.0, 60.0],
        [55.5, 60.0],
        [55.0, 59.5],
        [54.5, 59.5],
        [54.0, 59.5],
        [53.0, 59.0],
      ],
      // Column 4 (Right desk)
      [
        [67.5, 71.5],
        [68.5, 73.0],
        [69.5, 74.5],
        [70.5, 76.0],
        [71.5, 77.5],
        [72.5, 79.0],
        [73.5, 80.5],
      ],
    ];

    const positions: { posX: number; posY: number }[] = [];

    // PC-01 to PC-14 (Column 1, 7 rows x 2)
    // PC-15 to PC-28 (Column 2, 7 rows x 2)
    // PC-29 to PC-42 (Column 3, 7 rows x 2)
    // PC-43 to PC-56 (Column 4, 7 rows x 2)
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 7; r++) {
        const y = rowY[r];
        const [xLeft, xRight] = colX[c][r];
        positions.push({ posX: xLeft, posY: y });
        positions.push({ posX: xRight, posY: y });
      }
    }

    // PC-57 (Teacher Desk)
    positions.push({ posX: 39.0, posY: 13.5 });

    return positions;
  }

  const positions: { posX: number; posY: number }[] = [];
  const cols = 10;
  const rows = Math.ceil(count / cols);

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const itemsInRow = row === rows - 1 && count % cols !== 0 ? count % cols : cols;
    const xOffset = ((cols - itemsInRow) / 2) * (84 / (cols - 1));
    const posX = itemsInRow > 1
      ? Math.round((8 + xOffset + (col / (itemsInRow - 1)) * 84) * 10) / 10
      : 50;
    const posY = Math.round((10 + (row / Math.max(rows - 1, 1)) * 75) * 10) / 10;
    positions.push({ posX, posY });
  }
  return positions;
}

// Device name generator
function makeDevices(count: number, withPositions = false) {
  const positions = withPositions ? generatePositions(count) : [];
  return Array.from({ length: count }, (_, i) => ({
    name: `PC-${String(i + 1).padStart(2, '0')}`,
    posX: withPositions ? positions[i].posX : 0,
    posY: withPositions ? positions[i].posY : 0,
    status: 'normal',
  }));
}

async function main() {
  console.log('🌱 Seeding database...');

  // Clear in order (children first)
  await prisma.ticket.deleteMany();
  await prisma.device.deleteMany();
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
