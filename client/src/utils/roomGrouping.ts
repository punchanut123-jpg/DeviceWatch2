import type { Device, DeviceStatus } from '../types';

export interface GroupingConfig {
  /** Maximum Euclidean distance (%) between 2 devices to consider them a double-desk pair */
  pairDistanceThreshold?: number;
  /** Maximum Y coordinate variance (%) to consider pairs in the same horizontal row */
  rowYThreshold?: number;
  /** Minimum X gap (%) between adjacent pairs to render a visible aisle/passageway */
  aisleThreshold?: number;
  /** Base reference width for fixed coordinate canvas in pixels */
  baseWidth?: number;
  /** Base reference height for fixed coordinate canvas in pixels */
  baseHeight?: number;
}

export interface DevicePair {
  id: string;
  devices: Device[];
  isPair: boolean;
  centerPosX: number;
  centerPosY: number;
  centerPixelX: number;
  centerPixelY: number;
  hasAisleRight?: boolean;
}

export interface DeviceRow {
  rowIndex: number;
  posY: number;
  pairs: DevicePair[];
}

export interface GroupedRoomLayout {
  rows: DeviceRow[];
  allDevices: Device[];
  stats: {
    total: number;
    normal: number;
    broken: number;
    repair: number;
  };
  baseWidth: number;
  baseHeight: number;
}

export const DEFAULT_GROUPING_CONFIG: Required<GroupingConfig> = {
  pairDistanceThreshold: 8.5,
  rowYThreshold: 6.0,
  aisleThreshold: 12.0,
  baseWidth: 1000,
  baseHeight: 620,
};

/**
 * Pre-processes devices to ensure valid posX and posY percentage values.
 * If devices lack coordinates (null, undefined, 0), fallback grid positions are generated.
 */
export function ensureValidCoordinates(
  devices: Device[]
): (Device & { posX: number; posY: number })[] {
  if (!devices || devices.length === 0) return [];

  const hasCoordinates = devices.some(
    (d) =>
      d &&
      typeof d.posX === 'number' &&
      d.posX !== null &&
      typeof d.posY === 'number' &&
      d.posY !== null &&
      (d.posX > 0 || d.posY > 0)
  );

  if (hasCoordinates) {
    return devices.map((d, i) => {
      const validX = typeof d.posX === 'number' && d.posX !== null;
      const validY = typeof d.posY === 'number' && d.posY !== null;
      return {
        ...d,
        posX: validX ? Math.min(95, Math.max(5, d.posX!)) : 10 + (i % 6) * 15,
        posY: validY ? Math.min(95, Math.max(5, d.posY!)) : 15 + Math.floor(i / 6) * 12,
      };
    });
  }

  // Fallback grid generation for rooms without saved coordinates (all null)
  const count = devices.length;
  const cols = Math.min(10, Math.max(4, Math.ceil(Math.sqrt(count * 1.3))));
  const rows = Math.ceil(count / cols);

  return devices.map((device, idx) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const posX = Math.round((10 + (col / Math.max(cols - 1, 1)) * 80) * 10) / 10;
    const posY = Math.round((18 + (row / Math.max(rows - 1, 1)) * 70) * 10) / 10;
    return {
      ...device,
      posX,
      posY,
    };
  });
}

/**
 * Groups devices into pairs (double desks), horizontal rows, and calculates fixed pixel coordinates.
 * Pure function designed for predictable rendering and unit testing.
 */
export function groupDevicesIntoPairsAndRows(
  rawDevices: Device[],
  config: GroupingConfig = {}
): GroupedRoomLayout {
  const {
    pairDistanceThreshold,
    rowYThreshold,
    aisleThreshold,
    baseWidth,
    baseHeight,
  } = {
    ...DEFAULT_GROUPING_CONFIG,
    ...config,
  };

  const validDevices = ensureValidCoordinates(rawDevices);

  // Compute status summary stats
  const stats = {
    total: validDevices.length,
    normal: validDevices.filter((d) => d.status === 'normal').length,
    broken: validDevices.filter((d) => d.status === 'broken').length,
    repair: validDevices.filter((d) => d.status === 'under_repair').length,
  };

  if (validDevices.length === 0) {
    return { rows: [], allDevices: [], stats, baseWidth, baseHeight };
  }

  // Step 1: Pair detection using Euclidean distance
  const visited = new Set<number>();
  const pairs: DevicePair[] = [];

  for (let i = 0; i < validDevices.length; i++) {
    const d1 = validDevices[i];
    if (visited.has(d1.id)) continue;

    let closestPairDev: (Device & { posX: number; posY: number }) | null = null;
    let minDistance = Infinity;

    for (let j = i + 1; j < validDevices.length; j++) {
      const d2 = validDevices[j];
      if (visited.has(d2.id)) continue;

      const dx = d1.posX - d2.posX;
      const dy = d1.posY - d2.posY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDistance && dist <= pairDistanceThreshold) {
        minDistance = dist;
        closestPairDev = d2;
      }
    }

    if (closestPairDev) {
      visited.add(d1.id);
      visited.add(closestPairDev.id);

      // Sort pair left-to-right by posX
      const sortedPair = [d1, closestPairDev].sort((a, b) => a.posX - b.posX);
      const centerPosX = (sortedPair[0].posX + sortedPair[1].posX) / 2;
      const centerPosY = (sortedPair[0].posY + sortedPair[1].posY) / 2;

      pairs.push({
        id: `pair-${d1.id}-${closestPairDev.id}`,
        devices: sortedPair,
        isPair: true,
        centerPosX,
        centerPosY,
        centerPixelX: (centerPosX / 100) * baseWidth,
        centerPixelY: (centerPosY / 100) * baseHeight,
      });
    } else {
      visited.add(d1.id);
      pairs.push({
        id: `single-${d1.id}`,
        devices: [d1],
        isPair: false,
        centerPosX: d1.posX,
        centerPosY: d1.posY,
        centerPixelX: (d1.posX / 100) * baseWidth,
        centerPixelY: (d1.posY / 100) * baseHeight,
      });
    }
  }

  // Step 2: Row grouping by Y coordinate similarity
  pairs.sort((a, b) => a.centerPosY - b.centerPosY);

  const rows: DeviceRow[] = [];

  for (const pair of pairs) {
    let matchedRow = rows.find(
      (r) => Math.abs(r.posY - pair.centerPosY) <= rowYThreshold
    );

    if (matchedRow) {
      matchedRow.pairs.push(pair);
      matchedRow.posY =
        matchedRow.pairs.reduce((sum, p) => sum + p.centerPosY, 0) /
        matchedRow.pairs.length;
    } else {
      rows.push({
        rowIndex: rows.length,
        posY: pair.centerPosY,
        pairs: [pair],
      });
    }
  }

  // Step 3: Sort pairs left-to-right in each row & detect aisle gaps
  rows.forEach((row, idx) => {
    row.rowIndex = idx;
    row.pairs.sort((a, b) => a.centerPosX - b.centerPosX);

    for (let p = 0; p < row.pairs.length - 1; p++) {
      const currentPair = row.pairs[p];
      const nextPair = row.pairs[p + 1];
      const gap = nextPair.centerPosX - currentPair.centerPosX;
      if (gap >= aisleThreshold) {
        currentPair.hasAisleRight = true;
      }
    }
  });

  return {
    rows,
    allDevices: validDevices,
    stats,
    baseWidth,
    baseHeight,
  };
}

/**
 * Status color and label design tokens for Clean Light Enterprise Theme
 */
export const STATUS_TOKENS: Record<
  DeviceStatus,
  {
    bgTint: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
    iconBg: string;
    label: string;
  }
> = {
  normal: {
    bgTint: '#EAF3DE',
    border: '#27500A',
    text: '#27500A',
    badgeBg: '#EAF3DE',
    badgeText: '#27500A',
    iconBg: '#D5E8C3',
    label: 'ปกติ',
  },
  broken: {
    bgTint: '#FCEBEB',
    border: '#A32D2D',
    text: '#A32D2D',
    badgeBg: '#FCEBEB',
    badgeText: '#A32D2D',
    iconBg: '#F7D4D4',
    label: 'เสีย (รอซ่อม)',
  },
  under_repair: {
    bgTint: '#FAEEDA',
    border: '#854F0B',
    text: '#854F0B',
    badgeBg: '#FAEEDA',
    badgeText: '#854F0B',
    iconBg: '#F3DEC2',
    label: 'กำลังซ่อม',
  },
};
