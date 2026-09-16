const BASE_URL = '/api';

// ── Generic API Client ─────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

// ── Buildings API ──────────────────────────────────────────
export const api = {
  buildings: {
    list: () => request<import('../types').Building[]>('/buildings'),
    floors: (buildingId: number) =>
      request<import('../types').Floor[]>(`/buildings/${buildingId}/floors`),
    rooms: (floorId: number) =>
      request<import('../types').Room[]>(`/buildings/floors/${floorId}/rooms`),
    roomDetail: (roomId: number) =>
      request<import('../types').RoomDetail>(`/buildings/rooms/${roomId}`),
  },

  tickets: {
    create: (deviceId: number, description: string, token?: string, reportedByUserId?: number, studentId?: number) =>
      request<{ success: boolean; ticketId: number }>('/tickets', {
        method: 'POST',
        headers: token ? authHeaders(token) : undefined,
        body: JSON.stringify({ deviceId, description, reportedByUserId, studentId }),
      }),
  },

  identity: {
    student: (studentId: string, name: string) =>
      request<import('../types').User>('/identify/student', {
        method: 'POST',
        body: JSON.stringify({ studentId, name }),
      }),
    studentHistory: (id: number) =>
      request<import('../types').Ticket[]>(`/students/${id}/history`),
    teacherOverview: (token: string) =>
      request<any>('/teacher/overview', {
        headers: authHeaders(token),
      }),
  },

  auth: {
    login: (username: string, password: string) =>
      request<{ token: string; username: string; role: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
  },

  student: {
    register: (data: any) => 
      request<{ message: string }>('/student/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (studentId: string, password: string) =>
      request<{ token: string; student: any }>('/student/login', {
        method: 'POST',
        body: JSON.stringify({ studentId, password }),
      }),
    history: (token: string) =>
      request<import('../types').Ticket[]>('/student/history', {
        headers: authHeaders(token),
      }),
  },

  admin: {
    stats: (token: string) =>
      request<import('../types').AdminStats>('/admin/stats', {
        headers: authHeaders(token),
      }),
    tickets: (token: string, params?: { status?: string; page?: number }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.page) qs.set('page', String(params.page));
      return request<{
        tickets: import('../types').Ticket[];
        total: number;
        page: number;
        limit: number;
      }>(`/admin/tickets?${qs}`, { headers: authHeaders(token) });
    },
    updateTicket: (token: string, id: number, status: string) =>
      request<import('../types').Ticket>(`/admin/tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        headers: authHeaders(token),
      }),
    resetDevice: (token: string, deviceId: number) =>
      request<{ success: boolean; closedTickets: number }>(`/admin/reset-device/${deviceId}`, {
        method: 'PATCH',
        headers: authHeaders(token),
      }),
    updateRoomLayout: (token: string, roomId: number, devices: Array<{ id: number; posX: number | null; posY: number | null }>) =>
      request<{ success: boolean; updatedCount: number }>(`/admin/rooms/${roomId}/layout`, {
        method: 'PATCH',
        body: JSON.stringify({ devices }),
        headers: authHeaders(token),
      }),
  },
};
