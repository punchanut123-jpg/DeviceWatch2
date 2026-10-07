// ผังกริดสำหรับโต๊ะที่ยังไม่ได้วาง (x/y = null)
// คำนวณตอนแสดงผลเท่านั้น — ไม่เขียนลง DB (ค่าใน DB เป็น null จนกว่าแอดมินจะวางเอง/บันทึก)

const round1 = (n: number) => Math.round(n * 10) / 10;

/** คืนพิกัดเปอร์เซ็นต์สำหรับ count โต๊ะ เรียงเป็นกริดจัดกึ่งกลาง */
export function gridPositions(count: number): Array<{ x: number; y: number }> {
  if (count <= 0) return [];
  const cols = Math.max(1, Math.ceil(Math.sqrt(count * 1.4)));
  const rows = Math.ceil(count / cols);

  const positions: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = cols > 1 ? 8 + (col / (cols - 1)) * 84 : 50;
    const y = rows > 1 ? 22 + (row / (rows - 1)) * 66 : 55;
    positions.push({ x: round1(x), y: round1(y) });
  }
  return positions;
}

/** หาเลขโต๊ะถัดไปจาก label เดิม ("โต๊ะ 07" → 8) — ข้ามเลขที่ใช้อยู่แล้ว */
export function nextDeskNumber(existingLabels: string[]): number {
  const used = new Set<number>();
  for (const label of existingLabels) {
    const m = label.match(/(\d+)\s*$/);
    if (m) used.add(Number(m[1]));
  }
  let n = 1;
  while (used.has(n)) n += 1;
  return n;
}
