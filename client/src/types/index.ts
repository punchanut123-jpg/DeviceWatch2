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
  _count?: { devices: number };
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

export interface RoomDetail {
  id: number;
  name: string;
  floor: {
    id: number;
    number: number;
    building: { id: number; name: string };
  };
  devices: Device[];
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
