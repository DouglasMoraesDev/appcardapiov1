import { Router } from 'express';
import prisma from '../prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

// Middleware: require superadmin role or match SUPER_ADMIN_USER_ID
const requireSuperAdmin = (req: any, res: any, next: any) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const isSuper = req.user.role === 'superadmin' || String(req.user.id) === String(process.env.SUPER_ADMIN_USER_ID || '');
  if (!isSuper) return res.status(403).json({ error: 'Insufficient permissions' });
  next();
};

// GET /api/admin/establishments - list all establishments with aggregates
router.get('/establishments', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const perPage = Math.min(100, Math.max(5, Number(req.query.perPage || 10)));
    const name = req.query.name ? String(req.query.name) : undefined;
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    const where: any = {};
    if (name) where.name = { contains: name, mode: 'insensitive' };
    if (from || to) where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;

    // initial find with pagination
    const total = await prisma.establishment.count({ where });
    const rows = await prisma.establishment.findMany({ where, skip: (page - 1) * perPage, take: perPage, include: { adminUser: true, theme: true, _count: { select: { users: true, categories: true, products: true, tables: true, orders: true, feedbacks: true } } } });

    // aggregate revenue and lastOrder for returned rows
    const enhanced = await Promise.all(rows.map(async (e) => {
      const ag = await prisma.order.aggregate({ where: { establishmentId: e.id }, _sum: { total: true }, _max: { timestamp: true } as any });
      return {
        ...e,
        counts: e._count,
        revenue: (ag._sum?.total ?? 0),
        lastOrderAt: ag._max?.timestamp ?? null
      };
    }));

    res.json({ meta: { total, page, perPage, pages: Math.ceil(total / perPage) }, data: enhanced });
  } catch (err) {
    console.error('GET /admin/establishments error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET detail
router.get('/establishments/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const e = await prisma.establishment.findUnique({ where: { id }, include: { adminUser: true, theme: true, users: true, categories: true, products: true, tables: true } });
    if (!e) return res.status(404).json({ error: 'Establishment not found' });
    const ordersAgg = await prisma.order.aggregate({ where: { establishmentId: id }, _sum: { total: true }, _count: { _all: true }, _max: { timestamp: true } as any });
    const recentOrders = await prisma.order.findMany({ where: { establishmentId: id }, orderBy: { timestamp: 'desc' }, take: 20, include: { items: true } });
    res.json({ establishment: e, ordersAgg, recentOrders });
  } catch (err) {
    console.error('GET /admin/establishments/:id error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update establishment
router.put('/establishments/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = req.body || {};
    // handle theme payload if present
    const themePayload = data.theme;
    if (themePayload) delete data.theme;
    // allow adminUser assignment via adminUserId
    const allowed: any = {};
    for (const k of ['name','address','cep','cpfCnpj','logo','serviceCharge','adminUserId']) {
      if (Object.prototype.hasOwnProperty.call(data, k)) allowed[k] = data[k];
    }
    const updated = await prisma.establishment.update({ where: { id }, data: allowed });
    if (themePayload) {
      const e = await prisma.establishment.findUnique({ where: { id } });
      if (e?.themeId) {
        await prisma.theme.update({ where: { id: e.themeId }, data: themePayload }).catch(() => null);
      } else {
        const t = await prisma.theme.create({ data: themePayload }).catch(() => null);
        if (t) await prisma.establishment.update({ where: { id }, data: { themeId: t.id } }).catch(() => null);
      }
    }
    const fresh = await prisma.establishment.findUnique({ where: { id }, include: { adminUser: true, theme: true, users: true } });
    res.json(fresh);
  } catch (err: any) {
    console.error('PUT /admin/establishments/:id error', err);
    if (err?.code === 'P2025') return res.status(404).json({ error: 'Establishment not found' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE establishment
router.delete('/establishments/:id', authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.establishment.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err: any) {
    console.error('DELETE /admin/establishments/:id error', err);
    if (err?.code === 'P2025') return res.status(404).json({ error: 'Establishment not found' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
