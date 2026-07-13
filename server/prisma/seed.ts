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

  // 4. Mapping LINE User ID ของช่างประจำห้อง (เปลี่ยนค่า Uxxxxxxx เป็น User ID จริง)
  const roomLineMapping: Record<string, string> = {
    '26201': 'Uafdc29a4602455f7cd66cacb080f05c2',
    '26202': 'Uafdc29a4602455f7cd66cacb080f05c2',
    '26203': 'Uafdc29a4602455f7cd66cacb080f05c2',
    '26204': 'Uafdc29a4602455f7cd66cacb080f05c2',
    '26205': 'Uafdc29a4602455f7cd66cacb080f05c2',
    '26206': 'Uafdc29a4602455f7cd66cacb080f05c2',
  };

  // 5. ข้อมูลห้อง
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
        lineUserId: roomLineMapping[r.number] || null, // LINE User ID ของช่างประจำห้อง
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

  // ==========================================
  // ส่วนที่เพิ่มใหม่: ข้อมูลชั้น 4 และห้องปฏิบัติการ
  // ==========================================

  // ฟังก์ชันช่วยสร้างข้อมูลเครื่องคอมพิวเตอร์และจัดเรียงพิกัดเป็น Grid
  const generateGridDevices = (roomNumber: string, count: number) => {
    const devices = [];
    const cols = 6; // กำหนดให้เรียงเครื่องเป็นแถว แถวละ 6 เครื่อง
    
    for (let i = 1; i <= count; i++) {
      const row = Math.floor((i - 1) / cols);
      const col = (i - 1) % cols;
      
      devices.push({
        deviceCode: `${roomNumber}-${String(i).padStart(2, '0')}`,
        deviceName: `คอมพิวเตอร์ ${i}`,
        status: 'normal',
        posX: 5 + (col * 15), // ขยับแกน X ทีละ 15 เพื่อไม่ให้ซ้อนกัน
        posY: 5 + (row * 15), // ขยับแกน Y ทีละ 15 เพื่อไม่ให้ซ้อนกัน
      });
    }
    return devices;
  };

  // ใช้ lineUserId ตามที่ระบุมา
  const lineUserId = "Uafdc29a4602455f7cd66cacb080f05c2";

  console.log('กำลังสร้างข้อมูลชั้น 4...');

  // บันทึกข้อมูลชั้น 4 พร้อมห้องและเครื่องคอมพิวเตอร์แบบรวดเดียว
  await prisma.floor.create({
    data: {
      floorNumber: 4,
      name: 'ชั้น 4',
      // สำคัญ: อย่าลืมตรวจสอบว่าคุณมีตัวแปร building.id ประกาศไว้แล้วจากโค้ดชั้น 2
      buildingId: building.id, 
      rooms: {
        create: [
          {
            roomNumber: '26402',
            roomName: 'ห้องปฏิบัติการคอมพิวเตอร์ 26402',
            lineUserId: lineUserId,
            posX: 5,
            posY: 42,
            width: 18,
            height: 20,
            devices: {
              create: generateGridDevices('26402', 36)
            }
          },
          {
            roomNumber: '26403',
            roomName: 'ห้องปฏิบัติการคอมพิวเตอร์ 26403',
            lineUserId: lineUserId,
            posX: 5,
            posY: 22,
            width: 18,
            height: 18,
            devices: {
              create: generateGridDevices('26403', 38)
            }
          },
          {
            roomNumber: '26404',
            roomName: 'ห้องปฏิบัติการคอมพิวเตอร์ 26404',
            lineUserId: lineUserId,
            posX: 75,
            posY: 22,
            width: 18,
            height: 18,
            devices: {
              create: generateGridDevices('26404', 36)
            }
          },
          {
            roomNumber: '26406',
            roomName: 'ห้องปฏิบัติการคอมพิวเตอร์ 26406',
            lineUserId: lineUserId,
            posX: 75,
            posY: 65,
            width: 18,
            height: 18,
            devices: {
              create: generateGridDevices('26406', 20)
            }
          }
        ]
      }
    }
  });

  console.log('เพิ่มข้อมูลชั้น 4 และอุปกรณ์ทั้งหมดเรียบร้อยแล้ว!');

  // ==========================================
  // ส่วนที่เพิ่มใหม่: ข้อมูลชั้น 5
  // ==========================================
  console.log('กำลังสร้างข้อมูลชั้น 5...');

  await prisma.floor.create({
    data: {
      floorNumber: 5,
      name: 'ชั้น 5', // ปรับแก้จาก floorName เป็น name เพื่อไม่ให้เกิด Error ใน Prisma Client
      buildingId: building.id,
      rooms: {
        create: [
          // ห้องที่มีคอมพิวเตอร์
          {
            roomNumber: '26502',
            roomName: 'ห้องปฏิบัติการคอมพิวเตอร์ 26502',
            lineUserId: lineUserId,
            posX: 10, posY: 10, width: 20, height: 20,
            devices: { create: generateGridDevices('26502', 30) }
          },
          {
            roomNumber: '26503',
            roomName: 'ห้องปฏิบัติการคอมพิวเตอร์ 26503',
            lineUserId: lineUserId,
            posX: 40, posY: 10, width: 20, height: 20,
            devices: { create: generateGridDevices('26503', 30) }
          },
          // ห้องที่เหลือไม่มีเครื่อง (สร้างแค่ตัวห้อง)
          { roomNumber: '26504', roomName: 'ห้องพัก 26504', lineUserId: lineUserId, posX: 70, posY: 10, width: 20, height: 20 },
          { roomNumber: '26505', roomName: 'ห้องพัก 26505', lineUserId: lineUserId, posX: 10, posY: 50, width: 20, height: 20 },
          { roomNumber: '26506', roomName: 'ห้องพัก 26506', lineUserId: lineUserId, posX: 40, posY: 50, width: 20, height: 20 },
          { roomNumber: '26501', roomName: 'ห้องพัก 26501', lineUserId: lineUserId, posX: 70, posY: 50, width: 20, height: 20 }
        ]
      }
    }
  });

  console.log('สร้างข้อมูลชั้น 5 สำเร็จ!');

  console.log("Seeding completed.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
