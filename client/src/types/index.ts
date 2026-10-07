// Shared TypeScript types for DeviceWatch

export type DeviceStatus = 'normal' | 'broken' | 'under_repair';
export type TicketStatus = 'open' | 'in_progress' | 'resolved';

export interface User {
  id: number;
  role: 'student' | 'teacher';
  name: string;
  studentId?: string | null;
  createdAt: string;
}

export interface Building {
  id: number;
  name: string;
}

export interface Floor {
  id: number;
  number: number;
  _count?: { rooms: number };
}

export interface Room {
  id: number;
  name: string;
  _count?: { devices?: number; desks?: number };
}

export interface Device {
  id: number;
  name: string;
  posX: number | null;
  posY: number | null;
  status: DeviceStatus;
  room?: {
    name: string;
    floor?: {
      number: number;
      building?: { name: string };
    };
  };
}

/** เครื่องที่อยู่ในโต๊ะ (ฝั่ง RoomDetail) */
export interface DeskDevice {
  id: number;
  name: string;
  status: DeviceStatus;
}

/** โต๊ะในผังห้อง — x/y = null หมายถึงยังไม่ได้วาง (แสดงด้วยกริดคำนวณตอน render) */
export interface Desk {
  id: number;
  label: string;
  x: number | null;
  y: number | null;
  devices: DeskDevice[];
}

export interface RoomDetail {
  id: number;
  name: string;
  floor: {
    id: number;
    number: number;
    building: { id: number; name: string };
  };
  devices: Device[];
  desks: Desk[];
}

export interface Ticket {
  id: number;
  description: string;
  status: TicketStatus;
  deviceId: number;
  reportedByUserId?: number | null;
  student?: User;
  createdAt: string;
  updatedAt: string;
  device?: {
    name: string;
    room?: {
      id: number;
      name: string;
      floor?: {
        number: number;
        building?: { name: string };
      };
    };
  };
  reportedBy?: {
    name: string;
    studentId?: string | null;
  } | null;
}

export interface AdminStats {
  devices: {
    total: number;
    normal: number;
    broken: number;
    underRepair: number;
  };
  tickets: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
  };
  recentTickets: Ticket[];
}

/** payload บันทึกผังห้อง (PATCH /admin/rooms/:id/layout) */
export interface LayoutSavePayload {
  desks: Array<{ id?: number; label: string; x: number | null; y: number | null }>;
  deleteIds?: number[];
  assignments?: Array<{ deviceId: number; deskIndex: number | null }>;
}

export interface LayoutSaveResult {
  success: boolean;
  deskCount: number;
  poolCount: number;
  summary: string;
}

/** ตัวเลขที่ preview ก่อนยืนยันคัดลอกผัง */
export interface ApplyLayoutPreview {
  sourceRoomId: number;
  sourceRoomName: string;
  targetRoomName: string;
  existingDesks: number;
  desksToCreate: number;
  sourceDeskCount: number;
  matchedByName: number;
  assignedByOrder: number;
  toPool: number;
  totalDevices: number;
}

export interface ApplyLayoutResult {
  preview: ApplyLayoutPreview;
  success?: boolean;
  summary?: string;
}
