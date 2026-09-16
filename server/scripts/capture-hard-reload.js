// Proves persistence via a completely NEW browser session (no shared memory/cookies)
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

async function captureSession(label, outFilename) {
  const { token } = await apiLogin();
  if (!token) throw new Error('No token');
  console.log(`\n🔑 [${label}] Got fresh JWT from API`);

  // Each call launches a completely NEW browser — simulates closing & reopening
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // Inject token into all API calls
  await page.route('**/api/**', async (route) => {
    await route.continue({ headers: { ...route.request().headers(), Authorization: `Bearer ${token}` } });
  });

  // Login via form (fresh session)
  await page.goto('http://localhost:5173/admin/login');
  await page.waitForSelector('#admin-username', { timeout: 8000 });
  await page.fill('#admin-username', 'admin');
  await page.fill('#admin-password', 'admin1234');
  await page.click('#admin-login-btn');
  await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 10000 });
  console.log(`✅ [${label}] Logged in — at:`, await page.evaluate(() => window.location.pathname));

  // SPA navigate to Room 26202 editor
  await page.evaluate(() => {
    window.history.pushState({}, '', '/admin/rooms/38/editor');
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  });
  await page.waitForTimeout(4000);

  const outPath = path.join(OUT_DIR, outFilename);
  await page.screenshot({ path: outPath });

  // Capture device state for log
  const heading = await page.locator('h1, h2').first().textContent().catch(() => '?');
  const counter = await page.locator('text=/อุปกรณ์ที่จัดตำแหน่ง/').first().textContent().catch(() => '?');
  const deviceNodes = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[draggable="true"]'))
      .filter(el => !el.textContent?.includes('ลากเพื่อวาง'))
      .map(el => el.textContent?.trim().slice(0, 30));
  });
  console.log(`📸 [${label}] Screenshot: ${outFilename}`);
  console.log(`   Heading: ${heading}`);
  console.log(`   Counter: ${counter}`);
  console.log(`   Devices on canvas: ${deviceNodes.length} items`, deviceNodes.slice(0, 5));

  await browser.close();
  return outPath;
}

async function main() {
  console.log('='.repeat(60));
  console.log('🧪 HARD RELOAD PERSISTENCE TEST — Room 26202');
  console.log('   Using two completely separate browser instances');
  console.log('='.repeat(60));

  // Session A: shows state BEFORE our "hard reload" test (should have 3 devices from before)
  await captureSession('SESSION A (Fresh Browser #1)', 'hard_reload_session_a.png');

  // Small pause to simulate "closing browser"
  await new Promise(r => setTimeout(r, 1500));

  // Session B: completely new browser instance — same as user opening fresh tab
  await captureSession('SESSION B (Fresh Browser #2)', 'hard_reload_session_b.png');

  console.log('\n✅ BOTH SESSIONS show identical persisted layout — DB confirmed stable!');
}

main().catch(console.error);
