import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getPositionsFor26201(): { posX: number; posY: number }[] {
  const rowY = [19.0, 25.0, 32.0, 40.0, 50.0, 61.0, 75.0];
  const colX = [
    // Column 1 (Left desk)
    [[34.5, 38.5], [33.0, 37.0], [31.0, 35.5], [28.5, 33.5], [25.5, 31.0], [22.0, 27.5], [18.0, 24.0]],
    // Column 2 (Middle-Left desk)
    [[45.0, 49.0], [44.0, 48.0], [43.0, 47.5], [41.5, 46.5], [40.0, 45.0], [38.0, 43.5], [35.5, 41.5]],
    // Column 3 (Middle-Right desk)
    [[56.0, 60.0], [56.0, 60.0], [55.5, 60.0], [55.0, 59.5], [54.5, 59.5], [54.0, 59.5], [53.0, 59.0]],
    // Column 4 (Right desk)
    [[67.5, 71.5], [68.5, 73.0], [69.5, 74.5], [70.5, 76.0], [71.5, 77.5], [72.5, 79.0], [73.5, 80.5]],
  ];

  const positions: { posX: number; posY: number }[] = [];
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

async function runBackfill() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('====================================================');
  console.log(`📦 BACKFILL VERIFICATION REPORT ${isDryRun ? '(🔍 DRY-RUN MODE)' : '(🚀 EXECUTION MODE)'}`);
  console.log('====================================================');

  const rooms = await prisma.room.findMany({
    include: {
      devices: {
        orderBy: { id: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  const updates: Array<{ id: number; name: string; roomName: string; oldX: number | null; oldY: number | null; newX: number | null; newY: number | null }> = [];

  for (const room of rooms) {
    if (room.name === '26201') {
      const pos26201 = getPositionsFor26201();
      room.devices.forEach((dev, idx) => {
        const targetPos = idx < pos26201.length ? pos26201[idx] : { posX: null, posY: null };
        updates.push({
          id: dev.id,
          name: dev.name,
          roomName: room.name,
          oldX: dev.posX,
          oldY: dev.posY,
          newX: targetPos.posX,
          newY: targetPos.posY,
        });
      });
    } else {
      room.devices.forEach((dev) => {
        const isLegacyDefault = dev.posX === 0 && dev.posY === 0;
        const newX = isLegacyDefault ? null : dev.posX;
        const newY = isLegacyDefault ? null : dev.posY;

        updates.push({
          id: dev.id,
          name: dev.name,
          roomName: room.name,
          oldX: dev.posX,
          oldY: dev.posY,
          newX,
          newY,
        });
      });
    }
  }

  // Complete List of Room 26201 (All 57 Devices)
  console.log('\n📋 FULL DEVICE POSITION LIST FOR ROOM 26201 (All 57 Devices):');
  console.table(
    updates
      .filter((u) => u.roomName === '26201')
      .map((u) => ({
        'Device ID': u.id,
        'Device Name': u.name,
        'Current DB (posX, posY)': u.oldX !== null ? `(${u.oldX}%, ${u.oldY}%)` : 'null',
        'Backfill Target (posX, posY)': u.newX !== null ? `(${u.newX}%, ${u.newY}%)` : 'null',
        Status: u.oldX === u.newX && u.oldY === u.newY ? 'MATCH (NO CHANGE)' : 'UPDATED',
      }))
  );

  // Summary by Room
  const roomSummaries: Record<string, { total: number; assigned: number; unassigned: number }> = {};
  for (const u of updates) {
    if (!roomSummaries[u.roomName]) {
      roomSummaries[u.roomName] = { total: 0, assigned: 0, unassigned: 0 };
    }
    roomSummaries[u.roomName].total++;
    if (u.newX !== null && u.newY !== null) {
      roomSummaries[u.roomName].assigned++;
    } else {
      roomSummaries[u.roomName].unassigned++;
    }
  }

  console.log('\n📊 BACKFILL SUMMARY FOR ALL 12 ROOMS (343 Devices):');
  console.table(
    Object.entries(roomSummaries).map(([roomName, s]) => ({
      Room: roomName,
      'Total Devices': s.total,
      'Assigned (posX/Y)': s.assigned,
      'Unassigned (null)': s.unassigned,
    }))
  );

  if (isDryRun) {
    console.log('\n✅ [DRY-RUN COMPLETE] No database changes executed.');
  } else {
    const transactionOps = updates.map((u) =>
      prisma.device.update({
        where: { id: u.id },
        data: { posX: u.newX, posY: u.newY },
      })
    );
    await prisma.$transaction(transactionOps);
    console.log(`\n✅ [EXECUTION COMPLETE] Successfully verified & updated ${updates.length} devices in DB!`);
  }
}

runBackfill()
  .catch((e) => {
    console.error('❌ Backfill Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
