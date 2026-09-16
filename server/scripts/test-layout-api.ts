import express from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { adminRouter } from '../src/routes/admin';

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use('/api/admin', adminRouter);

async function runApiIntegrationTest() {
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://localhost:${port}`;

  console.log('🧪 Running Room Layout API Integration Test...');

  try {
    // Generate valid Admin JWT token
    const adminToken = jwt.sign(
      { id: 1, username: 'admin', role: 'admin' },
      process.env.JWT_SECRET || 'devicewatch-jwt-secret-change-me-in-production-2024'
    );

    // Get room 1 devices
    const room1 = await prisma.room.findFirst({
      where: { name: '26201' },
      include: { devices: { orderBy: { id: 'asc' }, take: 2 } },
    });

    if (!room1 || room1.devices.length < 2) {
      throw new Error('Room 26201 not found or lacks devices');
    }

    const d1 = room1.devices[0];
    const d2 = room1.devices[1];

    const testPayload = [
      { id: d1.id, posX: 42.5, posY: 55.0 },
      { id: d2.id, posX: 48.0, posY: 55.0 },
    ];

    // Send PATCH request
    const res = await fetch(`${baseUrl}/api/admin/rooms/${room1.id}/layout`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ devices: testPayload }),
    });

    const body: any = await res.json();
    console.log(`API Response: Status=${res.status}, Body=`, body);

    if (res.status !== 200 || !body.success) {
      throw new Error(`API update failed! Status ${res.status}`);
    }

    // Verify in database
    const updatedD1 = await prisma.device.findUnique({ where: { id: d1.id } });
    const updatedD2 = await prisma.device.findUnique({ where: { id: d2.id } });

    console.log(`DB Verification - Device ${d1.name}: posX=${updatedD1?.posX}, posY=${updatedD1?.posY}`);
    console.log(`DB Verification - Device ${d2.name}: posX=${updatedD2?.posX}, posY=${updatedD2?.posY}`);

    if (updatedD1?.posX !== 42.5 || updatedD1?.posY !== 55.0) {
      throw new Error('Database mismatch for device 1!');
    }

    // Revert test positions back to original
    await prisma.device.update({ where: { id: d1.id }, data: { posX: d1.posX, posY: d1.posY } });
    await prisma.device.update({ where: { id: d2.id }, data: { posX: d2.posX, posY: d2.posY } });

    console.log('✅ Room Layout API Integration Test PASSED 100%!');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runApiIntegrationTest().catch((err) => {
  console.error('❌ Integration Test FAILED:', err);
  process.exit(1);
});
