// ผังพิกัดแบบคำนวณ — ใช้ร่วมกันระหว่าง seed.ts และ scripts/migrate-to-desks.ts
// คืนค่าเป็นเปอร์เซ็นต์บนผัง (x%, y%) จำนวนเท่ากับ count

export function generatePositions(count: number): { posX: number; posY: number }[] {
  if (count === 57) {
    // ผังมือสำหรับห้อง 26201: 4 คอลัมน์ × 7 แถว × 2 ที่นั่ง + โต๊ะครู
    const rowY = [19.0, 25.0, 32.0, 40.0, 50.0, 61.0, 75.0];
    const colX = [
      [[34.5, 38.5], [33.0, 37.0], [31.0, 35.5], [28.5, 33.5], [25.5, 31.0], [22.0, 27.5], [18.0, 24.0]],
      [[45.0, 49.0], [44.0, 48.0], [43.0, 47.5], [41.5, 46.5], [40.0, 45.0], [38.0, 43.5], [35.5, 41.5]],
      [[56.0, 60.0], [56.0, 60.0], [55.5, 60.0], [55.0, 59.5], [54.5, 59.5], [54.0, 59.5], [53.0, 59.0]],
      [[67.5, 71.5], [68.5, 73.0], [69.5, 74.5], [70.5, 76.0], [71.5, 77.5], [72.5, 79.0], [73.5, 80.5]],
    ];

    const positions: { posX: number; posY: number }[] = [];

    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 7; r++) {
        const y = rowY[r];
        const [xLeft, xRight] = colX[c][r];
        positions.push({ posX: xLeft, posY: y });
        positions.push({ posX: xRight, posY: y });
      }
    }

    positions.push({ posX: 39.0, posY: 13.5 }); // PC-57 (โต๊ะครู)
    return positions;
  }

  const positions: { posX: number; posY: number }[] = [];
  const cols = 10;
  const rows = Math.ceil(count / cols);

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const itemsInRow = row === rows - 1 && count % cols !== 0 ? count % cols : cols;
    const xOffset = ((cols - itemsInRow) / 2) * (84 / (cols - 1));
    const posX = itemsInRow > 1
      ? Math.round((8 + xOffset + (col / (itemsInRow - 1)) * 84) * 10) / 10
      : 50;
    const posY = Math.round((10 + (row / Math.max(rows - 1, 1)) * 75) * 10) / 10;
    positions.push({ posX, posY });
  }
  return positions;
}
