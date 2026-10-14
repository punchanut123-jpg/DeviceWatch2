import {
  COMPONENT_ROLE,
  STATUS_SEVERITY,
  type DeviceType,
} from '../constants/layoutRules';

export interface RollupDevice {
  status: string;
  deviceType: string;
}

/**
 * สถานะโต๊ะ (rollup) = สถานะที่แย่ที่สุดใน "ชิ้นหลัก" (monitor/case/aio)
 * ชิ้นรอง (mouse/keyboard) ไม่เข้าเกณฑ์
 * ถ้ายังไม่มีชิ้นหลักบนโต๊ะ (ข้อมูลก่อน componentize) ใช้ทุกชิ้นแทน
 * คืน null เมื่อโต๊ะไม่มีเครื่องเลย
 */
export function rollupDeskStatus(devices: RollupDevice[]): string | null {
  if (devices.length === 0) return null;

  const main = devices.filter(
    (d) => COMPONENT_ROLE[d.deviceType as DeviceType] === 'main'
  );
  const pool = main.length > 0 ? main : devices;

  let worst = 'normal';
  for (const d of pool) {
    if (STATUS_SEVERITY.indexOf(d.status) > STATUS_SEVERITY.indexOf(worst)) {
      worst = d.status;
    }
  }
  return worst;
}

export interface DeskWithDevices {
  devices: RollupDevice[];
}

export interface DeskStatusCounts {
  total: number;
  normal: number;
  broken: number;
  underRepair: number;
}

/** นับโต๊ะตามสถานะ rollup — นับเฉพาะโต๊ะที่มีเครื่อง ≥ 1 (ตามกติการอบ 2) */
export function countDesksByStatus(desks: DeskWithDevices[]): DeskStatusCounts {
  const counts: DeskStatusCounts = { total: 0, normal: 0, broken: 0, underRepair: 0 };

  for (const desk of desks) {
    if (desk.devices.length === 0) continue;
    counts.total += 1;
    const status = rollupDeskStatus(desk.devices);
    if (status === 'broken') counts.broken += 1;
    else if (status === 'under_repair') counts.underRepair += 1;
    else counts.normal += 1;
  }
  return counts;
}
