import { Router } from 'express';
import prisma from '../prisma';
import { authenticate, authorize } from '../middleware/auth';
import { setEstablishmentOnCreate, ensureResourceBelongsToUser } from '../middleware/multiTenant';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';
import { generalLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const where: any = {};
    const tenantId = (req as any).tenantId ?? null;
    if (tenantId) where.establishmentId = Number(tenantId);
    else if (req.query.establishmentId) where.establishmentId = Number(req.query.establishmentId as string);
    else if ((req as any).user && (req as any).user.establishmentId) where.establishmentId = Number((req as any).user.establishmentId);
    const categories = await prisma.category.findMany({ where, include: { products: true } });
    res.json(categories);
  } catch (err) {
    console.error('GET /categories error', err);
    res.status(500).json({ error: 'Erro ao listar categorias' });
  }
});

const categorySchema = z.object({ name: z.string().min(1) });

router.post('/', authenticate, authorize(['admin']), setEstablishmentOnCreate, generalLimiter, validateBody(categorySchema), async (req, res) => {
  const { name } = req.body;
  const establishmentId = req.body?.establishmentId ?? (req as any).user?.establishmentId ?? null;
  const cat = await prisma.category.create({ data: { name, establishmentId } });
  res.json(cat);
});

router.put('/:id', authenticate, authorize(['admin']), ensureResourceBelongsToUser('category'), generalLimiter, validateBody(categorySchema), async (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body;
  const updated = await prisma.category.update({ where: { id }, data: { name } });
  res.json(updated);
});

router.delete('/:id', authenticate, authorize(['admin']), ensureResourceBelongsToUser('category'), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.category.delete({ where: { id } });
  res.json({ ok: true });
});

router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  const id = Number(req.params.id);
  // Optionally move products to a default category before deleting
  await prisma.category.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
