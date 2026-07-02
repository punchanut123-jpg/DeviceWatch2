import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding...");

  // 1. ล้างข้อมูลเก่า (เผื่อกรณีจำเป็น)
  await prisma.ticket.deleteMany({});
  await prisma.device.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.floor.deleteMany({});
  await prisma.building.deleteMany({});

  // 2. สร้างอาคาร
  const building = await prisma.building.create({
    data: { name: "อาคารคณะเทคโนโลยีสารสนเทศ" }
  });

  // 3. สร้างชั้น 2
  const floor = await prisma.floor.create({
    data: {
      buildingId: building.id,
      floorNumber: 2
    }
  });

  // 4. ข้อมูลห้อง
  const rooms = [
    { number: "26201", name: "ห้องปฏิบัติการคอมพิวเตอร์ 26201", x: 5, y: 65, w: 18, h: 22, count: 57 },
    { number: "26202", name: "ห้องปฏิบัติการคอมพิวเตอร์ 26202", x: 5, y: 42, w: 18, h: 20, count: 31 },
    { number: "26203", name: "ห้องปฏิบัติการคอมพิวเตอร์ 26203", x: 5, y: 22, w: 18, h: 18, count: 29 },
    { number: "26204", name: "ห้องปฏิบัติการคอมพิวเตอร์ 26204", x: 75, y: 65, w: 18, h: 22, count: 4 },
    { number: "26205", name: "ห้องปฏิบัติการคอมพิวเตอร์ 26205", x: 75, y: 22, w: 18, h: 20, count: 1 },
    { number: "26206", name: "ห้องปฏิบัติการคอมพิวเตอร์ 26206", x: 75, y: 5, w: 18, h: 15, count: 29 },
  ];

  for (const r of rooms) {
    const room = await prisma.room.create({
      data: {
        floorId: floor.id,
        roomNumber: r.number,
        roomName: r.name,
        posX: r.x,
        posY: r.y,
        width: r.w,
        height: r.h,
      }
    });

    // กำหนดพิกัด X ของแถวโต๊ะคอมพิวเตอร์ทั้ง 6 คอลัมน์ตามรูปแปลนจริง (%)
    const xColumns = [21.5, 30.0, 38.5, 49.0, 59.5, 68.0];
    const totalCols = xColumns.length;

    const devices = Array.from({ length: r.count }).map((_, i) => {
      const colIndex = i % totalCols;
      const rowIndex = Math.floor(i / totalCols);
      const totalRows = Math.ceil(r.count / totalCols);

      // แกน X อิงตำแหน่งแถวโต๊ะจริงในรูป
      const deviceX = xColumns[colIndex];

      // แกน Y เริ่มจากใต้จอโปรเจคเตอร์ (39%) ลงมาถึงแถวล่างสุด (92%)
      const startY = 39;
      const endY = 92;
      const deviceY = startY + (rowIndex * (endY - startY) / Math.max(1, totalRows - 1));

      return {
        deviceCode: `${r.number}-${String(i + 1).padStart(2, '0')}`,
        deviceName: `คอมพิวเตอร์ ${i + 1}`,
        posX: parseFloat(deviceX.toFixed(2)),
        posY: parseFloat(deviceY.toFixed(2)),
        status: "normal",
        roomId: room.id
      };
    });

    await prisma.device.createMany({ data: devices });
  }
  console.log("Seeding completed.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
