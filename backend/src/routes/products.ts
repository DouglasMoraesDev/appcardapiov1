import { Router } from 'express';
import prisma from '../prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.get('/', async (req, res) => {
  const products = await prisma.product.findMany({ include: { category: true } });
  res.json(products);
});

router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { name, description, price, image, categoryId, category, isHighlight } = req.body;
    let resolvedCategoryId: number | null = categoryId ?? null;
    if (!resolvedCategoryId && category && typeof category === 'string') {
      // find or create category by name
      let cat = await prisma.category.findFirst({ where: { name: category } });
      if (!cat) cat = await prisma.category.create({ data: { name: category } });
      resolvedCategoryId = cat.id;
    }
    const product = await prisma.product.create({ data: { name, description, price: Number(price || 0), image, categoryId: resolvedCategoryId, isHighlight: !!isHighlight }, include: { category: true } });
    return res.json(product);
  } catch (err) {
    console.error('POST /products error', err);
    return res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

router.put('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const incoming = { ...(req.body || {}) } as any;
    // support category name in update payload
    if (incoming.category && typeof incoming.category === 'string') {
      let cat = await prisma.category.findFirst({ where: { name: incoming.category } });
      if (!cat) cat = await prisma.category.create({ data: { name: incoming.category } });
      incoming.categoryId = cat.id;
      delete incoming.category;
    }
    const updated = await prisma.product.update({ where: { id }, data: incoming, include: { category: true } });
    return res.json(updated);
  } catch (err: any) {
    console.error('PUT /products/:id error', err);
    if (err?.code === 'P2025') return res.status(404).json({ error: 'Product not found' });
    return res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.product.delete({ where: { id } });
  res.json({ ok: true });
});

export default router;
