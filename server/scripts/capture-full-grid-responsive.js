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
  console.log('✅ Student 64000001 created/reset successfully.');
}

async function loginAndCapture(page, isMobile = false) {
  // Go to student login page
  await page.goto('http://localhost:5173/student/login');
  await page.waitForSelector('input[type="text"]', { timeout: 10000 });
  
  const idInput = page.locator('input[type="text"]');
  await idInput.fill('64000001');

  const pwInput = page.locator('input[type="password"]');
  await pwInput.fill('password123');

  await page.click('button[type="submit"]');

  // Wait for login redirection to Dashboard (/)
  await page.waitForURL((url) => !url.href.includes('/student/login'), { timeout: 10000 });
  console.log(`✅ Logged in successfully on ${isMobile ? 'Mobile' : 'Desktop'}. Current URL:`, page.url());

  // Step 1: Click Building
  await page.waitForSelector('.building-card', { timeout: 10000 });
  await page.locator('.building-card').first().click();
  await page.waitForTimeout(800);

  // Step 2: Click Floor 2
  await page.waitForSelector('.floor-card', { timeout: 10000 });
  const floor2 = page.locator('.floor-card:has-text("2")').first();
  if (await floor2.count() > 0) {
    await floor2.click();
  } else {
    await page.locator('.floor-card').first().click();
  }
  await page.waitForTimeout(800);

  // Step 3: Click Room 26201
  await page.waitForSelector('.room-card', { timeout: 10000 });
  const room26201 = page.locator('.room-card:has-text("26201")').first();
  if (await room26201.count() > 0) {
    await room26201.click();
  } else {
    await page.locator('.room-card').first().click();
  }

  // Wait for Room 26201 page to render (.rl2d-wrapper)
  await page.waitForSelector('.rl2d-wrapper', { timeout: 10000 });
  await page.waitForTimeout(1000);
  console.log('✅ Room 26201 page loaded. Current URL:', page.url());

  // Click Grid toggle button
  const gridBtn = page.locator('button.rl2d-seg-btn:has-text("Grid")');
  if (await gridBtn.count() > 0) {
    await gridBtn.click();
    await page.waitForTimeout(1500);
    console.log('✅ Clicked Grid toggle button');
  }

  // Count items
  const itemCount = await page.locator('.rl2d-grid-item').count();
  console.log(`📊 Device items count in Grid View (${isMobile ? 'Mobile 375px' : 'Desktop 1280px'}): ${itemCount}`);

  const fileName = isMobile ? 'room26201_grid_mobile_375px.png' : 'room26201_grid_desktop_1280px.png';
  const savePath = path.join(ARTIFACT_DIR, fileName);
  await page.screenshot({ path: savePath, fullPage: true });
  console.log(`📸 Saved screenshot: ${savePath}`);
}

async function main() {
  await resetAndCreateStudent();

  const browser = await chromium.launch({ headless: true });

  // 1. Desktop View (1280px)
  console.log('\n🖥️ --- Desktop View (1280px) ---');
  const ctxDesktop = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pageDesktop = await ctxDesktop.newPage();
  await loginAndCapture(pageDesktop, false);

  // 2. Mobile View (375px)
  console.log('\n📱 --- Mobile View (375px) ---');
  const ctxMobile = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const pageMobile = await ctxMobile.newPage();
  await loginAndCapture(pageMobile, true);

  await browser.close();
  await prisma.$disconnect();
  console.log('\n🎉 All captures completed successfully!');
}

main().catch(console.error);
