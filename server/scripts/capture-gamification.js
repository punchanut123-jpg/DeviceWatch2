const { chromium } = require('playwright');
const path = require('path');
const http = require('http');

const OUT_DIR = 'C:\\Users\\Lenovo\\.gemini\\antigravity-ide\\brain\\22df5877-f5ab-4509-ada5-7383fc930a94';

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
  console.log('✅ Got JWT');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // Inject token into all API calls
  await page.route('**/api/**', async (route) => {
    await route.continue({ headers: { ...route.request().headers(), Authorization: `Bearer ${token}` } });
  });

  // Login via form
  await page.goto('http://localhost:5173/admin/login');
  await page.waitForSelector('#admin-username', { timeout: 8000 });
  await page.fill('#admin-username', 'admin');
  await page.fill('#admin-password', 'admin1234');
  await page.click('#admin-login-btn');
  await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 10000 });
  console.log('✅ Logged in');

  // SPA navigate to Room 26202 editor (all 31 devices are now assigned → 100%)
  await page.evaluate(() => {
    window.history.pushState({}, '', '/admin/rooms/38/editor');
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  });
  await page.waitForTimeout(4000);

  // Screenshot 1: 100% progress bar + green save button (without banner — wait for banner to appear)
  const p1 = path.join(OUT_DIR, 'gamify_100pct_progress.png');
  await page.screenshot({ path: p1 });
  console.log('📸 Screenshot 1 (100% progress + green button):', p1);

  // Verify what we see
  const heading = await page.locator('h1, h2').first().textContent().catch(() => '?');
  const buttons = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim())
  );
  console.log('Heading:', heading, '| Buttons:', buttons);

  // Screenshot 2: zoom in on top-right area (button area) for a close-up
  // Crop: capture just the header + progress bar zone
  const p2 = path.join(OUT_DIR, 'gamify_green_button_closeup.png');
  await page.screenshot({ path: p2, clip: { x: 0, y: 0, width: 1440, height: 120 } });
  console.log('📸 Screenshot 2 (green button close-up):', p2);

  // Screenshot 3: Celebration banner — it shows when 100%, navigate back and push to editor again
  // The banner auto-shows when progressPct hits 100 (useEffect)
  // Re-trigger by navigating away and back
  await page.evaluate(() => {
    window.history.pushState({}, '', '/admin');
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    window.history.pushState({}, '', '/admin/rooms/38/editor');
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  });
  // Capture quickly after load — banner shows for 4s
  await page.waitForTimeout(2500);

  const p3 = path.join(OUT_DIR, 'gamify_celebration_banner.png');
  await page.screenshot({ path: p3 });
  console.log('📸 Screenshot 3 (celebration banner):', p3);

  await browser.close();
  console.log('\n✅ All 3 gamification screenshots captured!');
}

capture().catch(console.error);
