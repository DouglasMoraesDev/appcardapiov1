import { Router } from 'express';
import prisma from '../prisma';
import bcrypt from 'bcryptjs';
import { authenticate, authorize } from '../middleware/auth';
import { setEstablishmentOnCreate, ensureResourceBelongsToUser } from '../middleware/multiTenant';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';
import { generalLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const where: any = {};
    const tenantId = (req as any).tenantId ?? null;
    if (tenantId) where.establishmentId = Number(tenantId);
    else if ((req as any).user && (req as any).user.establishmentId) where.establishmentId = Number((req as any).user.establishmentId);
    const users = await prisma.user.findMany({ where });
    res.json(users);
  } catch (err) {
    console.error('GET /users error', err);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

const createUserSchema = z.object({ name: z.string().min(1), username: z.string().min(3), password: z.string().min(6), role: z.string().min(1), pin: z.string().optional() });

router.post('/', authenticate, authorize(['admin']), setEstablishmentOnCreate, generalLimiter, validateBody(createUserSchema), async (req, res) => {
  const { name, username, password, role, pin } = req.body;
  const hashed = password ? await bcrypt.hash(password, 8) : undefined;
  try {
    const establishmentId = req.body?.establishmentId ?? (req as any).user?.establishmentId ?? null;
    const user = await prisma.user.create({ data: { name, username, password: hashed, role, pin, establishmentId } });
    res.json(user);
  } catch (error: any) {
    // handle unique username
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error('POST /users error', error);
    return res.status(500).json({ error: 'Failed to create user', details: error?.message });
  }
});

router.delete('/:id', authenticate, authorize(['admin']), ensureResourceBelongsToUser('user'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.user.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
