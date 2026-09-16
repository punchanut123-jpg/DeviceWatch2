const { chromium } = require('playwright');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

const ARTIFACT_DIR = 'C:\\Users\\Lenovo\\.gemini\\antigravity-ide\\brain\\03768aa2-989c-4a5c-a96c-abb92c24e866';

async function resetAndCreateStudent() {
  await prisma.student.deleteMany({ where: { studentId: '64000001' } });
  const passwordHash = await bcrypt.hash('password123', 10);
  await prisma.student.create({
    data: {
      name: 'นักศึกษา ทดสอบ',
      studentId: '64000001',
      passwordHash,
    },
  });
}

async function captureAll() {
  await resetAndCreateStudent();
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop View (1280px) - Room View 26201
  console.log('🖥️ Capturing Room View (Desktop 1280px)...');
  const ctxDesktop = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageDesktop = await ctxDesktop.newPage();

  await pageDesktop.goto('http://localhost:5173/student/login');
  await pageDesktop.waitForSelector('input[type="text"]');
  await pageDesktop.fill('input[type="text"]', '64000001');
  await pageDesktop.fill('input[type="password"]', 'password123');
  await pageDesktop.click('button[type="submit"]');
  await pageDesktop.waitForURL((url) => !url.href.includes('/student/login'));

  // Dashboard screenshot first
  const dashPath = path.join(ARTIFACT_DIR, 'after_remove_wave_dashboard_desktop.png');
  await pageDesktop.screenshot({ path: dashPath, fullPage: true });
  console.log('📸 Saved Dashboard Desktop:', dashPath);

  // Navigate to Room 26201
  await pageDesktop.locator('.building-card').first().click();
  await pageDesktop.waitForTimeout(600);
  await pageDesktop.locator('.floor-card').first().click();
  await pageDesktop.waitForTimeout(600);
  await pageDesktop.locator('.room-card').first().click();
  await pageDesktop.waitForSelector('.rl2d-wrapper');
  await pageDesktop.waitForTimeout(1000);

  // Grid view
  const gridBtnD = pageDesktop.locator('button.rl2d-seg-btn:has-text("Grid")');
  if (await gridBtnD.count() > 0) {
    await gridBtnD.click();
    await pageDesktop.waitForTimeout(1000);
  }

  const roomDeskPath = path.join(ARTIFACT_DIR, 'after_remove_wave_room_desktop.png');
  await pageDesktop.screenshot({ path: roomDeskPath, fullPage: true });
  console.log('📸 Saved Room Desktop:', roomDeskPath);

  // 2. Mobile View (375px) - Room View 26201
  console.log('📱 Capturing Room View (Mobile 375px)...');
  const ctxMobile = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const pageMobile = await ctxMobile.newPage();

  await pageMobile.goto('http://localhost:5173/student/login');
  await pageMobile.waitForSelector('input[type="text"]');
  await pageMobile.fill('input[type="text"]', '64000001');
  await pageMobile.fill('input[type="password"]', 'password123');
  await pageMobile.click('button[type="submit"]');
  await pageMobile.waitForURL((url) => !url.href.includes('/student/login'));

  // Navigate to Room 26201
  await pageMobile.locator('.building-card').first().click();
  await pageMobile.waitForTimeout(600);
  await pageMobile.locator('.floor-card').first().click();
  await pageMobile.waitForTimeout(600);
  await pageMobile.locator('.room-card').first().click();
  await pageMobile.waitForSelector('.rl2d-wrapper');
  await pageMobile.waitForTimeout(1000);

  // Grid view
  const gridBtnM = pageMobile.locator('button.rl2d-seg-btn:has-text("Grid")');
  if (await gridBtnM.count() > 0) {
    await gridBtnM.click();
    await pageMobile.waitForTimeout(1000);
  }

  const roomMobPath = path.join(ARTIFACT_DIR, 'after_remove_wave_room_mobile.png');
  await pageMobile.screenshot({ path: roomMobPath, fullPage: true });
  console.log('📸 Saved Room Mobile:', roomMobPath);

  await browser.close();
  await prisma.$disconnect();
  console.log('🎉 Done capturing wave-removed screenshots!');
}

captureAll().catch(console.error);
