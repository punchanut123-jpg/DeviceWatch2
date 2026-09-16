import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const rooms = await prisma.room.findMany({ orderBy: { id: 'asc' } });
  console.log('ROOM LIST IN DATABASE:');
  console.table(rooms.map(r => ({ id: r.id, name: r.name })));
}
main().finally(() => prisma.$disconnect());
