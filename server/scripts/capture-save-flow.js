const { chromium } = require('playwright');
const path = require('path');
const http = require('http');

const OUT_DIR = 'C:\\Users\\Lenovo\\.gemini\\antigravity-ide\\brain\\22df5877-f5ab-4509-ada5-7383fc930a94';
const APP_BASE = 'http://localhost:5173';

function apiLogin() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ username: 'admin', password: 'admin1234' });
    const req = http.request(
      { hostname: 'localhost', port: 3000, path: '/api/auth/login', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function capture() {
  const { token } = await apiLogin();
  if (!token) throw new Error('No token received from API');
  console.log('✅ Got JWT from API');

  const browser = await chromium.launch({ headless: false }); // headed so we can see what happens
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // Intercept ALL /api/ requests to inject Authorization header
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const headers = { ...req.headers(), 'Authorization': `Bearer ${token}` };
    await route.continue({ headers });
  });

  // Step 1: Navigate to login page and do a real login so React state is set
  await page.goto(`${APP_BASE}/admin/login`);
  await page.waitForSelector('#admin-username', { timeout: 8000 });
  await page.fill('#admin-username', 'admin');
  await page.fill('#admin-password', 'admin1234');
  await page.click('#admin-login-btn');

  // Wait until we are on admin dashboard (React state has token)
  await page.waitForFunction(
    () => !window.location.pathname.includes('/login'),
    { timeout: 10000 }
  );
  console.log('✅ Logged in, now at:', await page.evaluate(() => window.location.pathname));

  // Step 2: Use React Router client-side navigation (avoids full page reload that clears memory)
  await page.evaluate(() => {
    // Trigger React Router navigation without a full browser navigation
    window.history.pushState({}, '', '/admin/rooms/38/editor');
    // Dispatch popstate so React Router picks up the change
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  });
  await page.waitForTimeout(3500);
  console.log('✅ Client-side navigated to editor, path:', await page.evaluate(() => window.location.pathname));

  // BEFORE screenshot
  const beforePath = path.join(OUT_DIR, 'save_flow_before_drag.png');
  await page.screenshot({ path: beforePath });
  console.log('📸 BEFORE saved');

  // Debug info
  const heading = await page.locator('h1, h2').first().textContent().catch(() => '?');
  console.log('Page heading:', heading);
  const buttons = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim().slice(0, 40))
  );
  console.log('Buttons:', buttons);
  const draggables = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[draggable="true"]')).map(el => el.textContent?.trim().slice(0, 30))
  );
  console.log(`Draggable items (${draggables.length}):`, draggables.slice(0, 5));

  // Drag first unassigned item if found
  if (draggables.length > 0) {
    const firstDrag = page.locator('[draggable="true"]').first();
    const fromBox = await firstDrag.boundingBox();
    if (fromBox) {
      // Drop onto left third of viewport, midway down
      const tx = 400, ty = 400;
      await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
      await page.mouse.down();
      for (let i = 1; i <= 20; i++) {
        await page.mouse.move(
          fromBox.x + fromBox.width / 2 + ((tx - fromBox.x - fromBox.width / 2) * i) / 20,
          fromBox.y + fromBox.height / 2 + ((ty - fromBox.y - fromBox.height / 2) * i) / 20
        );
        await page.waitForTimeout(15);
      }
      await page.mouse.up();
      await page.waitForTimeout(600);
      console.log('✅ Drag completed');
    }
  }

  // Click save
  const saveBtn = page.locator('button').filter({ hasText: /บันทึก/ }).first();
  if (await saveBtn.count() > 0) {
    await saveBtn.click();
    await page.waitForTimeout(2500);
    console.log('✅ Save clicked');
  }

  // After-save screenshot
  const afterSavePath = path.join(OUT_DIR, 'save_flow_after_save.png');
  await page.screenshot({ path: afterSavePath });
  console.log('📸 AFTER SAVE saved');

  // Simulate "reload" with client-side nav again
  await page.evaluate(() => {
    window.history.pushState({}, '', '/admin');
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    window.history.pushState({}, '', '/admin/rooms/38/editor');
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  });
  await page.waitForTimeout(3500);

  const afterReloadPath = path.join(OUT_DIR, 'save_flow_after_reload.png');
  await page.screenshot({ path: afterReloadPath });
  console.log('📸 AFTER RELOAD saved');

  await browser.close();
}

capture().catch(console.error);
