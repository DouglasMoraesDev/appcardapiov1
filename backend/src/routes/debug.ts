import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Development-only debug endpoints
router.get('/users', async (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).json({ error: 'Not found' });
  try {
    const users = await prisma.user.findMany({ orderBy: { id: 'asc' } });
    res.json(users);
  } catch (e) {
    console.error('DEBUG /users error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Clear refresh cookie (development helper)
router.post('/clear-refresh', (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).json({ error: 'Not found' });
  try {
    res.clearCookie('refreshToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/api/auth' });
    return res.json({ ok: true });
  } catch (e) {
    console.error('DEBUG /clear-refresh error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

export default router;

