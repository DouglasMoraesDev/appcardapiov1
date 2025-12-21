import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token provided' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'Token error' });
  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) return res.status(401).json({ error: 'Token malformatted' });
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.userId) return res.status(401).json({ error: 'Token invalid' });
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = { id: user.id, name: user.name, role: user.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalid' });
  }
};

export const authorize = (roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  next();
};
