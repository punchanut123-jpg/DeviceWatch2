// กฎการจัดผังห้อง — ไฟล์คู่ขนานกับ server/src/constants/layoutRules.ts
// ทั้งสองไฟล์ต้องเหมือนกันทุกตัวอักษร — เช็คด้วย `npx tsx server/scripts/check-layout-rules.ts`
// (รันอัตโนมัติทุกครั้งที่ `npm run build` ฝั่ง server)

/** จำนวนอุปกรณ์สูงสุดต่อโต๊ะ (ค่าคงที่ตัวเดียวของระบบ) */
export const MAX_DEVICES_PER_DESK = 5;

export type DeviceType = 'monitor' | 'case' | 'mouse' | 'keyboard' | 'aio';

export const DEVICE_TYPES: readonly DeviceType[] = [
  'monitor',
  'case',
  'mouse',
  'keyboard',
  'aio',
] as const;

export type DeviceTypeLabel = Record<DeviceType, string>;

export const DEVICE_TYPE_LABELS: DeviceTypeLabel = {
  monitor: 'จอ',
  case: 'เคส',
  mouse: 'เมาส์',
  keyboard: 'คีย์บอร์ด',
  aio: 'AIO',
};

/** ชิ้นหลัก = มีผลกับสถานะโต๊ะ (rollup), ชิ้นรอง = โชว์รายชิ้นเท่านั้น */
export type ComponentRole = 'main' | 'secondary';

export const COMPONENT_ROLE: Record<DeviceType, ComponentRole> = {
  monitor: 'main',
  case: 'main',
  aio: 'main',
  mouse: 'secondary',
  keyboard: 'secondary',
};

export type PresetKey = 'standard' | 'aio';

export const PRESET_LABELS: Record<PresetKey, string> = {
  standard: 'ชุดมาตรฐาน',
  aio: 'ชุด AIO',
};

export const PRESETS: Record<PresetKey, DeviceType[]> = {
  standard: ['monitor', 'case', 'mouse', 'keyboard'],
  aio: ['aio', 'mouse', 'keyboard'],
};

/** true = อนุญาตให้มีชนิดซ้ำบนโต๊ะเดียว (แก้กฎต่อชนิด ไม่ hardcode ในโค้ดลากวาง) */
export const DUPLICATE_ALLOWED: Record<DeviceType, boolean> = {
  monitor: false,
  case: false,
  mouse: false,
  keyboard: false,
  aio: false,
};

/** ลำดับความสำคัญของสถานะโต๊ะ: แย่กว่าอยู่หลัง (คำนวณ rollup จากชิ้นหลัก) */
export const STATUS_SEVERITY: readonly string[] = ['normal', 'under_repair', 'broken'] as const;
