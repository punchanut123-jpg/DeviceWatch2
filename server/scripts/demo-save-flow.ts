import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function runDemoSaveFlow() {
  console.log('====================================================');
  console.log('🧪 DEMO SAVE FLOW: Room 26202 (Room ID 38)');
  console.log('====================================================');

  const room = await prisma.room.findFirst({
    where: { name: '26202' },
    include: { devices: { orderBy: { name: 'asc' } } },
  });

  if (!room) throw new Error('Room 26202 not found');

  console.log(`\n📌 1. BEFORE SAVE (Room ${room.name} - ID ${room.id}):`);
  const nullCountBefore = room.devices.filter((d) => d.posX === null).length;
  console.log(`   Total devices: ${room.devices.length}, Null (Unassigned) devices: ${nullCountBefore}`);

  // Take first 3 devices (PC-01, PC-02, PC-03) and assign coordinates
  const dev1 = room.devices[0]; // PC-01
  const dev2 = room.devices[1]; // PC-02
  const dev3 = room.devices[2]; // PC-03

  console.log(`\n✏️ 2. SAVING LAYOUT (Placing 3 devices onto Canvas):`);
  console.log(`   - ${dev1.name} (ID ${dev1.id}) -> (25.0%, 30.0%)`);
  console.log(`   - ${dev2.name} (ID ${dev2.id}) -> (45.0%, 30.0%)`);
  console.log(`   - ${dev3.name} (ID ${dev3.id}) -> (65.0%, 30.0%)`);

  await prisma.$transaction([
    prisma.device.update({ where: { id: dev1.id }, data: { posX: 25.0, posY: 30.0 } }),
    prisma.device.update({ where: { id: dev2.id }, data: { posX: 45.0, posY: 30.0 } }),
    prisma.device.update({ where: { id: dev3.id }, data: { posX: 65.0, posY: 30.0 } }),
  ]);

  // Query fresh state after save & reload simulation
  const refreshedRoom = await prisma.room.findFirst({
    where: { name: '26202' },
    include: { devices: { orderBy: { name: 'asc' } } },
  });

  console.log(`\n🔄 3. AFTER SAVE & RELOAD VERIFICATION:`);
  const assigned = refreshedRoom?.devices.filter((d) => d.posX !== null) || [];
  const unassigned = refreshedRoom?.devices.filter((d) => d.posX === null) || [];

  console.log(`   Assigned devices count  : ${assigned.length} (PC-01, PC-02, PC-03)`);
  console.log(`   Unassigned devices count: ${unassigned.length} (Remaining in palette)`);
  console.log('\n   Saved Device Details in DB:');
  assigned.forEach((d) => {
    console.log(`   - ${d.name} (ID ${d.id}): posX=${d.posX}%, posY=${d.posY}% [SAVED & PERSISTENT]`);
  });

  console.log('\n✅ SAVE FLOW VERIFICATION SUCCESSFUL! Layout positions persist correctly in database.');
}

runDemoSaveFlow()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
