import { Router } from 'express';
import prisma from '../prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', async (req, res) => {
  const categories = await prisma.category.findMany({ include: { products: true } });
  res.json(categories);
});

router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  const { name } = req.body;
  const cat = await prisma.category.create({ data: { name } });
  res.json(cat);
});

router.put('/:id', authenticate, authorize(['admin']), async (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body;
  const updated = await prisma.category.update({ where: { id }, data: { name } });
  res.json(updated);
});

router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  const id = Number(req.params.id);
  // Optionally move products to a default category before deleting
  await prisma.category.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
