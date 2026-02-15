import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from './prisma.js';
import { authRequired, requireRole, signToken } from './auth.js';
import { Role, TicketStatus } from '@prisma/client';

const app = express();
app.use(express.json());

// Basic error shielding (prevents Zod errors from crashing the process)
process.on('uncaughtException', (err) => {
  console.error('uncaughtException', err);
});
process.on('unhandledRejection', (err) => {
  console.error('unhandledRejection', err);
});

app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
}));

app.get('/health', (_req, res) => res.json({ ok: true }));

// --- auth ---
app.post('/auth/login', async (req, res) => {
  // Allow non-email usernames in MVP (admin@local)
  const body = z.object({ email: z.string().min(1), password: z.string().min(1) }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });
  const ok = await bcrypt.compare(body.password, user.password);
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
  const token = signToken({ sub: user.id, role: user.role, email: user.email });
  return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

// --- admin: users ---
app.post('/admin/users', authRequired, requireRole([Role.admin]), async (req, res) => {
  const body = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    role: z.nativeEnum(Role),
    password: z.string().min(8)
  }).parse(req.body);

  const password = await bcrypt.hash(body.password, 10);
  const u = await prisma.user.create({ data: { email: body.email, name: body.name, role: body.role, password } });
  return res.json({ id: u.id, email: u.email, name: u.name, role: u.role });
});

// --- buildings/rooms/beds ---
app.get('/buildings', authRequired, async (_req, res) => {
  const list = await prisma.building.findMany({ include: { rooms: { include: { beds: true } } } });
  res.json(list);
});

app.post('/buildings', authRequired, requireRole([Role.admin, Role.dorm_manager]), async (req, res) => {
  const body = z.object({ name: z.string().min(1) }).parse(req.body);
  const b = await prisma.building.create({ data: body });
  res.json(b);
});

app.post('/rooms', authRequired, requireRole([Role.admin, Role.dorm_manager]), async (req, res) => {
  const body = z.object({ buildingId: z.string(), floor: z.number().int(), number: z.string().min(1) }).parse(req.body);
  const r = await prisma.room.create({ data: body });
  res.json(r);
});

app.post('/beds', authRequired, requireRole([Role.admin, Role.dorm_manager]), async (req, res) => {
  const body = z.object({ roomId: z.string(), label: z.string().min(1) }).parse(req.body);
  const b = await prisma.bed.create({ data: body });
  res.json(b);
});

// --- students occupancy ---
app.post('/students', authRequired, requireRole([Role.admin, Role.dorm_manager]), async (req, res) => {
  const body = z.object({ userId: z.string(), studentNo: z.string().min(1) }).parse(req.body);
  const s = await prisma.student.create({ data: body, include: { user: true, bed: true } });
  res.json(s);
});

app.post('/students/:id/checkin', authRequired, requireRole([Role.admin, Role.dorm_manager]), async (req, res) => {
  const studentId = z.string().parse(req.params.id);
  const body = z.object({ bedId: z.string() }).parse(req.body);

  const bed = await prisma.bed.findUnique({ where: { id: body.bedId }, include: { student: true } });
  if (!bed) return res.status(404).json({ error: 'bed_not_found' });
  if (bed.student) return res.status(409).json({ error: 'bed_occupied' });

  const updated = await prisma.student.update({ where: { id: studentId }, data: { bedId: body.bedId }, include: { user: true, bed: { include: { room: { include: { building: true } } } } } });
  res.json(updated);
});

app.post('/students/:id/checkout', authRequired, requireRole([Role.admin, Role.dorm_manager]), async (req, res) => {
  const studentId = z.string().parse(req.params.id);
  const updated = await prisma.student.update({ where: { id: studentId }, data: { bedId: null }, include: { user: true } });
  res.json(updated);
});

// --- tickets ---
app.get('/tickets', authRequired, async (req, res) => {
  const u = (req as any).user as { sub: string; role: Role };
  const where = (u.role === Role.student) ? { userId: u.sub } : {};
  const list = await prisma.ticket.findMany({ where, orderBy: { createdAt: 'desc' } });
  res.json(list);
});

app.post('/tickets', authRequired, async (req, res) => {
  const u = (req as any).user as { sub: string };
  const body = z.object({ title: z.string().min(1), description: z.string().min(1) }).parse(req.body);
  const t = await prisma.ticket.create({ data: { ...body, userId: u.sub } });
  res.json(t);
});

app.patch('/tickets/:id', authRequired, requireRole([Role.admin, Role.dorm_manager]), async (req, res) => {
  const id = z.string().parse(req.params.id);
  const body = z.object({ status: z.nativeEnum(TicketStatus) }).parse(req.body);
  const t = await prisma.ticket.update({ where: { id }, data: body });
  res.json(t);
});

// Express error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  if (err?.name === 'ZodError') {
    return res.status(400).json({ error: 'validation_error', details: err.issues });
  }
  console.error(err);
  return res.status(500).json({ error: 'internal_error' });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`backend listening on :${port}`);
});
