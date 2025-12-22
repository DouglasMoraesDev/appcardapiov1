import { Router } from 'express';
import prisma from '../prisma';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';
import { sendEvent } from '../notifications';
import { setEstablishmentOnCreate } from '../middleware/multiTenant';

// Note: feedbacks can be created anonymously; when possible we attach establishmentId

const router = Router();

router.get('/', async (req, res) => {
  try {
    const where: any = {};
    if ((req as any).user && (req as any).user.establishmentId) where.establishmentId = Number((req as any).user.establishmentId);
    else if (req.query.establishmentId) where.establishmentId = Number(req.query.establishmentId as string);
    const feedbacks = await prisma.feedback.findMany({ where });
    res.json(feedbacks);
  } catch (err) {
    console.error('GET /feedbacks error', err);
    res.status(500).json({ error: 'Erro ao listar feedbacks' });
  }
});

const feedbackSchema = z.object({ tableNumber: z.number(), rating: z.number().min(1).max(5), comment: z.string().optional().nullable() });

router.post('/', setEstablishmentOnCreate, validateBody(feedbackSchema), async (req, res) => {
  const { tableNumber, rating, comment } = req.body;
  // prefer establishmentId set by middleware (authenticated users)
  let estId = (req as any).body?.establishmentId;
  if (!estId) {
    // try to find table by number and use its establishment
    const table = await prisma.table.findFirst({ where: { number: Number(tableNumber) } });
    estId = table?.establishmentId ?? null;
  }
  const f = await prisma.feedback.create({ data: { tableNumber: Number(tableNumber), rating: Number(rating), comment, establishmentId: estId } });
  res.json(f);
  try { sendEvent('feedback_created', { id: f.id, tableNumber: f.tableNumber, rating: f.rating }); } catch (e) {}
});

export default router;
