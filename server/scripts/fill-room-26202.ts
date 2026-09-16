// Set all 31 devices in Room 26202 to assigned positions to trigger 100% state
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fillAllDevices() {
  const room = await prisma.room.findFirst({
    where: { name: '26202' },
    include: { devices: { orderBy: { name: 'asc' } } },
  });
  if (!room) throw new Error('Room 26202 not found');

  console.log(`Room 26202 (ID ${room.id}) — total ${room.devices.length} devices`);

  // Assign grid positions to ALL devices (7 columns)
  const COLS = 7;
  const updates = room.devices.map((d, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const posX = Math.round((15 + col * 12) * 10) / 10;
    const posY = Math.round((20 + row * 14) * 10) / 10;
    return prisma.device.update({ where: { id: d.id }, data: { posX, posY } });
  });

  await prisma.$transaction(updates);
  console.log(`✅ Set ${updates.length} devices to grid positions — Room 26202 now at 100%`);
}

fillAllDevices().finally(() => prisma.$disconnect());
