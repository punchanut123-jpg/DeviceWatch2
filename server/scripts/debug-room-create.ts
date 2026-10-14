import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const room = await prisma.room.create({
    data: { name: 'TMP-TEST3', floorId: 16 },
  });
  console.log('Created room:', room);
  
  const rooms = await prisma.room.findMany({
    where: { name: { startsWith: 'TMP-' } },
  });
  console.log('All TMP rooms:', rooms);
  
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());