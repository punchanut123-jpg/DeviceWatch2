// Capture Grid view of Room 26201 (57 devices, all assigned)
const { chromium } = require('playwright');
const path = require('path');
const http = require('http');

const OUT_DIR = 'C:\\Users\\Lenovo\\.gemini\\antigravity-ide\\brain\\22df5877-f5ab-4509-ada5-7383fc930a94';

function apiLogin() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ username: 'student1', password: '1234' });
    const req = http.request(
      { hostname: 'localhost', port: 3000, path: '/api/student/login', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { resolve({}); }
      }); }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // Go to student login
  await page.goto('http://localhost:5173/student/login');
  await page.waitForSelector('input', { timeout: 8000 });

  // Fill login
  const inputs = page.locator('input');
  const count = await inputs.count();
  console.log(`Found ${count} inputs`);

  // Try to find student login form
  await page.fill('input[type="text"], input[name*="id"], input:first-of-type', 'student1');
  await page.waitForTimeout(300);
  const pwInputs = page.locator('input[type="password"]');
  if (await pwInputs.count() > 0) {
    await pwInputs.first().fill('1234');
  }

  // Click login button
  const loginBtn = page.locator('button').filter({ hasText: /เข้า|Login|login/i }).first();
  if (await loginBtn.count() > 0) {
    await loginBtn.click();
  } else {
    await page.locator('button[type="submit"]').first().click();
  }

  await page.waitForTimeout(3000);
  const currentUrl = page.url();
  console.log('After login URL:', currentUrl);

  if (currentUrl.includes('/student/login')) {
    // Login failed - take screenshot to debug
    await page.screenshot({ path: path.join(OUT_DIR, 'debug_login.png') });
    console.log('Login failed, see debug_login.png');
    await browser.close();
    return;
  }

  // Navigate to room 26201 (ID 37)
  await page.goto('http://localhost:5173/room/37');
  await page.waitForTimeout(4000);
  console.log('On room page, URL:', page.url());

  // Screenshot: Layout view (canvas/2D)
  const before = path.join(OUT_DIR, 'roomview_layout_full.png');
  await page.screenshot({ path: before, fullPage: false });
  console.log('📸 Layout view screenshot saved');

  // Find and click Grid toggle button
  const gridBtn = page.locator('button').filter({ hasText: /Grid|ตาราง|grid/i }).first();
  if (await gridBtn.count() > 0) {
    await gridBtn.click();
    await page.waitForTimeout(1500);
    console.log('✅ Switched to Grid view');
  } else {
    // Try any toggle button
    const toggleBtns = page.locator('[class*="toggle"], [class*="view-btn"]');
    const tcount = await toggleBtns.count();
    console.log(`Toggle buttons found: ${tcount}`);
    if (tcount > 0) {
      await toggleBtns.last().click();
      await page.waitForTimeout(1500);
    }
  }

  // Full page screenshot of grid view
  const gridPath = path.join(OUT_DIR, 'roomview_grid_full.png');
  await page.screenshot({ path: gridPath, fullPage: true });
  console.log('📸 Grid view full screenshot saved:', gridPath);

  // Count device cards
  const deviceCards = await page.evaluate(() =>
    document.querySelectorAll('[class*="device-card"], [class*="device-item"], [class*="device-row"]').length
  );
  console.log(`Device cards in grid: ${deviceCards}`);

  await browser.close();
}

capture().catch(console.error);
