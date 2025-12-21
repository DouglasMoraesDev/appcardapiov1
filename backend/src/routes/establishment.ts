import { Router } from 'express';
import prisma from '../prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const e = await prisma.establishment.findFirst({ include: { theme: true, adminUser: true } });
    return res.json(e);
  } catch (err) {
    console.error('GET /establishment error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { name, address, cep, cpfCnpj, logo, serviceCharge, theme } = req.body;
    const themeData = theme || { background: '#06120c', card: '#0d1f15', text: '#fefce8', primary: '#d18a59', accent: '#c17a49' };
    const createdTheme = await prisma.theme.create({ data: { ...themeData } }).catch(() => null);
    const e = await prisma.establishment.create({ data: { name, address, cep, cpfCnpj, logo, serviceCharge: Number(serviceCharge || 10), themeId: createdTheme?.id } });
    return res.json(e);
  } catch (err) {
    console.error('POST /establishment error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const data = req.body;
    const updated = await prisma.establishment.update({ where: { id }, data });
    return res.json(updated);
  } catch (err: any) {
    console.error('PUT /establishment/:id error', err);
    if (err?.code === 'P2025') return res.status(404).json({ error: 'Establishment not found' });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Convenience: update the first establishment (no id) - useful for frontend sync in dev
// Protected for safety
router.put('/', async (req, res) => {
  try {
    const data = req.body || {};
    const themePayload = data.theme;
    if (themePayload) delete data.theme;

    // whitelist allowed establishment fields
    const allowedFields = ['name', 'address', 'cep', 'cpfCnpj', 'logo', 'serviceCharge', 'adminUserId'];
    const payload: any = {};
    for (const k of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(data, k) && data[k] !== undefined) payload[k] = data[k];
    }

    let e = await prisma.establishment.findFirst();

    // If an establishment exists, require admin auth
    if (e) {
      const auth = req.headers.authorization;
      if (!auth) return res.status(401).json({ error: 'Not authenticated' });
      try {
        const parts = auth.split(' ');
        if (parts.length !== 2) return res.status(401).json({ error: 'Token error' });
        const token = parts[1];
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'changeme');
        if (!decoded || !decoded.userId) return res.status(401).json({ error: 'Token invalid' });
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Insufficient permissions' });
      } catch (err) {
        return res.status(401).json({ error: 'Token invalid' });
      }

      // update establishment fields (without theme)
      const updated = await prisma.establishment.update({ where: { id: e.id }, data: payload });
      // handle theme separately
      if (themePayload) {
        if (e.themeId) {
          await prisma.theme.update({ where: { id: e.themeId }, data: themePayload }).catch(() => null);
        } else {
          const t = await prisma.theme.create({ data: themePayload }).catch(() => null);
          if (t) await prisma.establishment.update({ where: { id: e.id }, data: { themeId: t.id } }).catch(() => null);
        }
      }
      const fresh = await prisma.establishment.findUnique({ where: { id: e.id }, include: { theme: true } });
      return res.json(fresh);
    }

    // No establishment exists: allow creation (bootstrap). Optionally create admin user if provided
    let themeId = null as number | null;
    if (themePayload) {
      const t = await prisma.theme.create({ data: themePayload }).catch(() => null);
      themeId = t?.id ?? null;
    }

    // If admin user data provided, create user and set adminUserId
    if (data.adminUser && typeof data.adminUser === 'object') {
      const au = data.adminUser as any;
      const hashed = au.password ? await bcrypt.hash(String(au.password), 8) : undefined;
      const createdUser = await prisma.user.create({ data: { name: au.name || 'Admin', username: au.username, password: hashed, role: 'admin' } }).catch(() => null);
      if (createdUser) payload.adminUserId = createdUser.id;
    }

    const createPayload: any = {};
    for (const k of ['name', 'address', 'cep', 'cpfCnpj', 'logo', 'serviceCharge', 'adminUserId']) {
      if (Object.prototype.hasOwnProperty.call(payload, k) && payload[k] !== undefined) createPayload[k] = payload[k];
    }
    createPayload.themeId = themeId;
    const created = await prisma.establishment.create({ data: { ...createPayload } });
    return res.json(created);
  } catch (err) {
    console.error('PUT /establishment (convenience) error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
