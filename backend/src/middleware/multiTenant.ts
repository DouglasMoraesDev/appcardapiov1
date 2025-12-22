import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import { AuthRequest } from './auth';

// Ensure request is authenticated and has establishmentId
export const requireEstablishment = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!req.user.establishmentId) return res.status(403).json({ error: 'No establishment associated with user' });
  next();
};

// For creation: set body.establishmentId to user's establishmentId if not provided
export const setEstablishmentOnCreate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!req.body) req.body = {};
    if (!req.body.establishmentId) req.body.establishmentId = req.user.establishmentId;
    next();
  } catch (e) { next(e as any); }
};

// Generic guard to ensure a resource belongs to the user's establishment
export const ensureResourceBelongsToUser = (model: string, idParam = 'id') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
      const id = Number(req.params[idParam] || req.body[idParam]);
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const client: any = (prisma as any)[model];
      if (!client || !client.findUnique) return res.status(500).json({ error: 'Invalid model' });
      const rec = await client.findUnique({ where: { id } });
      if (!rec) return res.status(404).json({ error: `${model} not found` });
      const estId = rec.establishmentId ?? null;
      if (!estId || String(estId) !== String(req.user.establishmentId)) return res.status(403).json({ error: 'Resource does not belong to your establishment' });
      next();
    } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
  };
};
