// ตรวจสอบว่า layoutRules ของ client กับ server ตรงกันทุกค่า
// รันอัตโนมัติใน `npm run build` (ฝั่ง server) และทุกครั้งตอน verify
//   npx tsx scripts/check-layout-rules.ts

import * as serverRules from '../src/constants/layoutRules';
import * as clientRules from '../../client/src/utils/layoutRules';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function deepEqual(a: unknown, b: unknown, path: string, diffs: string[]): void {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      diffs.push(`${path}: ความยาว array ต่างกัน (${a.length} vs ${b.length})`);
      return;
    }
    a.forEach((item, i) => deepEqual(item, b[i], `${path}[${i}]`, diffs));
    return;
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      deepEqual(a[key], b[key], `${path}.${key}`, diffs);
    }
    return;
  }
  if (a !== b) {
    diffs.push(`${path}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
  }
}

function main() {
  const s = serverRules as unknown as Record<string, unknown>;
  const c = clientRules as unknown as Record<string, unknown>;
  const diffs: string[] = [];

  const allKeys = new Set([...Object.keys(s), ...Object.keys(c)]);
  for (const key of allKeys) {
    if (!(key in s)) {
      diffs.push(`ขาดฝั่ง server: ${key}`);
      continue;
    }
    if (!(key in c)) {
      diffs.push(`ขาดฝั่ง client: ${key}`);
      continue;
    }
    deepEqual(s[key], c[key], key, diffs);
  }

  if (diffs.length > 0) {
    console.error('❌ layoutRules ไม่ตรงกัน:');
    for (const d of diffs) console.error(`   - ${d}`);
    console.error('');
    console.error('แก้ให้ไฟล์ server/src/constants/layoutRules.ts กับ client/src/utils/layoutRules.ts เหมือนกัน');
    process.exit(1);
  }

  console.log(`✅ layoutRules ตรงกันทั้ง ${allKeys.size} ค่า export`);
}

main();
