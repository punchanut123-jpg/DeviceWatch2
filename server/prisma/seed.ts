import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  const building = await prisma.building.create({
    data: {
      name: 'อาคาร IT',
      floors: {
        create: Array.from({ length: 3 }).map((_, i) => ({
          floorNumber: i + 1,
          name: `ชั้น ${i + 1}`,
          rooms: {
            create: Array.from({ length: 2 }).map((_, j) => ({
              roomNumber: `Room-${i + 1}0${j + 1}`,
              roomName: `ห้อง ${i + 1}0${j + 1}`,
              posX: j * 200 + 50,
              posY: 50,
              width: 150,
              height: 100,
              devices: {
                create: Array.from({ length: 5 }).map((_, k) => ({
                  deviceCode: `PC-${i}-${j}-${k}`,
                  deviceName: `คอมพิวเตอร์ ${k + 1}`,
                  posX: Math.random() * 100,
                  posY: Math.random() * 80,
                  status: Math.random() > 0.8 ? 'broken' : 'normal',
                })),
              },
            })),
          },
        })),
      },
    },
  });

  console.log(`✅ Created building: ${building.name}`);
  console.log('🎉 Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
