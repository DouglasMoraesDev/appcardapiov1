import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  const feedbacks = await prisma.feedback.findMany();
  res.json(feedbacks);
});

router.post('/', async (req, res) => {
  const { tableNumber, rating, comment } = req.body;
  const f = await prisma.feedback.create({ data: { tableNumber: Number(tableNumber), rating: Number(rating), comment } });
  res.json(f);
});

export default router;
