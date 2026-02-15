// Prefer same-origin proxy to avoid CORS/proxy issues.
// In dev (docker), Vite proxy maps /api -> backend.
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export type User = { id: string; email: string; name: string; role: 'admin' | 'dorm_manager' | 'student' };

export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(t: string | null) {
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
}

async function req(path: string, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'request_failed');
  return data;
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export const api = {
  health: () => req('/health'),
  login: (email: string, password: string) => req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => req('/auth/me'),

  buildings: () => req('/buildings'),
  createBuilding: (name: string) => req('/buildings', { method: 'POST', body: JSON.stringify({ name }) }),
  createRoom: (buildingId: string, floor: number, number: string) => req('/rooms', { method: 'POST', body: JSON.stringify({ buildingId, floor, number }) }),
  createBed: (roomId: string, label: string) => req('/beds', { method: 'POST', body: JSON.stringify({ roomId, label }) }),

  students: () => req('/students'),
  createStudent: (userId: string, studentNo: string) => req('/students', { method: 'POST', body: JSON.stringify({ userId, studentNo }) }),
  checkin: (studentId: string, bedId: string) => req(`/students/${studentId}/checkin`, { method: 'POST', body: JSON.stringify({ bedId }) }),
  checkout: (studentId: string) => req(`/students/${studentId}/checkout`, { method: 'POST' }),

  tickets: () => req('/tickets'),
  createTicket: (title: string, description: string) => req('/tickets', { method: 'POST', body: JSON.stringify({ title, description }) }),
  updateTicket: (id: string, status: TicketStatus) => req(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};
