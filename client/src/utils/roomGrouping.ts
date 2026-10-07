import type { DeviceStatus } from '../types';

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
