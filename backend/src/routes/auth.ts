
import { Router } from 'express';
import prisma from '../prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { authLimiter } from '../middleware/rateLimiter';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES_DAYS = 7;



// Registro de novo usuário
const registerSchema = z.object({ username: z.string(), password: z.string().min(6), name: z.string(), role: z.string() });
router.post('/register', validateBody(registerSchema), async (req, res) => {
  const { username, password, name, role } = req.body;
  try {
    // Verifica se já existe usuário com esse username
    const exists = await prisma.user.findFirst({ where: { username } });
    if (exists) {
      return res.status(409).json({ error: 'Usuário já existe' });
    }
    // Criptografa a senha
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { username, password: hashed, name, role } });
    res.json({ id: user.id, username: user.username, name: user.name, role: user.role });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao registrar usuário', details: error.message });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  const user = await prisma.user.findFirst({ where: { username } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  // Always compare with bcrypt; disallow plaintext password comparison for security.
  const match = user.password ? await bcrypt.compare(password, user.password) : false;
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  // role enforcement
  if (role && user.role !== role) return res.status(403).json({ error: 'Invalid role' });

  // issue access token only (no refresh tokens)
  const accessToken = jwt.sign({ userId: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '3h' });
  const body: any = { accessToken, user: { id: user.id, name: user.name, role: user.role } };
  res.json(body);
});

// /refresh removed: stateless JWT workflow

router.post('/logout', async (req, res) => {
  // stateless logout — client must remove stored token
  res.json({ ok: true });
});

export default router;
