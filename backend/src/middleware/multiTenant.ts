import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import { AuthRequest } from './auth';

// resolveTenant middleware: determine req.tenantId from header, query, hostname or authenticated user
export const resolveTenant = async (req: AuthRequest & Request, res: Response, next: NextFunction) => {
  try {
    // priority: X-Establishment-Id header -> query param -> hostname (optional) -> authenticated user
    const header = req.headers['x-establishment-id'] as string | undefined;
    const q = req.query?.establishmentId as string | undefined;
    let tenantId: number | null = null;
    if (header) {
      const n = Number(header);
      if (!Number.isNaN(n)) tenantId = n;
    }
    if (!tenantId && q) {
      const n = Number(q);
      if (!Number.isNaN(n)) tenantId = n;
    }

    // optional: resolve by subdomain when enabled
    try {
      if (!tenantId && process.env.ENABLE_TENANT_BY_SUBDOMAIN === '1') {
        const host = (req.hostname || req.headers.host || '').toString();
        const parts = host.split('.');
        if (parts.length > 2) {
          const sub = parts[0].toLowerCase();
          const found = await prisma.establishment.findFirst({ where: { name: sub } }).catch(() => null);
          if (found) tenantId = found.id;
        }
      }
    } catch (e) {
      // ignore db errors here
    }

    // fallback to authenticated user's establishment
    if (!tenantId && (req as any).user && (req as any).user.establishmentId) {
      tenantId = Number((req as any).user.establishmentId);
    }

    (req as any).tenantId = tenantId ?? null;
    next();
  } catch (e) { next(e as any); }
};

// Ensure request is authenticated and has establishmentId
export const requireEstablishment = (req: AuthRequest & Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!((req as any).tenantId || req.user.establishmentId)) return res.status(403).json({ error: 'No establishment associated with user' });
  next();
};

// For creation: set body.establishmentId to tenantId or user's establishmentId if not provided
export const setEstablishmentOnCreate = (req: AuthRequest & Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body) req.body = {};
    if (!req.body.establishmentId) {
      if ((req as any).tenantId) req.body.establishmentId = (req as any).tenantId;
      else if ((req as any).user && (req as any).user.establishmentId) req.body.establishmentId = (req as any).user.establishmentId;
    }
    next();
  } catch (e) { next(e as any); }
};

// Generic guard to ensure a resource belongs to the tenant (or user's establishment)
export const ensureResourceBelongsToUser = (model: string, idParam = 'id') => {
  return async (req: AuthRequest & Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params[idParam] || req.body[idParam]);
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const client: any = (prisma as any)[model];
      if (!client || !client.findUnique) return res.status(500).json({ error: 'Invalid model' });
      const rec = await client.findUnique({ where: { id } });
      if (!rec) return res.status(404).json({ error: `${model} not found` });
      const estId = rec.establishmentId ?? null;
      const tenantId = (req as any).tenantId ?? (req as any).user?.establishmentId ?? null;
      if (!estId || !tenantId || String(estId) !== String(tenantId)) return res.status(403).json({ error: 'Resource does not belong to your establishment' });
      next();
    } catch (e) { console.error(e); return res.status(500).json({ error: 'Server error' }); }
  };
};
