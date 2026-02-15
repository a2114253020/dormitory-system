import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import type { Request, Response, NextFunction } from 'express';

export type JwtPayload = {
  sub: string;
  role: Role;
  email: string;
};

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const JWT_SECRET = () => mustEnv('JWT_SECRET');
export const JWT_EXPIRES_IN = () => process.env.JWT_EXPIRES_IN || '7d';

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET(), { expiresIn: JWT_EXPIRES_IN() });
}

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthorized' });
  const token = h.slice('Bearer '.length);
  try {
    const decoded = jwt.verify(token, JWT_SECRET()) as JwtPayload;
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

export function requireRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const u = (req as any).user as JwtPayload | undefined;
    if (!u) return res.status(401).json({ error: 'unauthorized' });
    if (!roles.includes(u.role)) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}
