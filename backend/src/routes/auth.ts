
import { Router } from 'express';
import prisma from '../prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES_DAYS = 7;

function makeRefreshToken(){
  return crypto.randomBytes(48).toString('hex');
}

// Registro de novo usuário
router.post('/register', async (req, res) => {
  const { username, password, name, role } = req.body;
  if (!username || !password || !name || !role) {
    return res.status(400).json({ error: 'username, password, name e role são obrigatórios' });
  }
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

router.post('/login', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  const user = await prisma.user.findFirst({ where: { username } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const match = (user.password === password) || await bcrypt.compare(password, user.password || '');
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  // role enforcement
  if (role && user.role !== role) return res.status(403).json({ error: 'Invalid role' });

  const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });

  // create refresh token record and set as httpOnly cookie
  const refreshToken = makeRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } });
  // clear any previous cookie set on different paths to evitar duplicatas
  res.clearCookie('refreshToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, sameSite: 'lax', path: '/', expires: expiresAt });

  res.json({ accessToken, user: { id: user.id, name: user.name, role: user.role } });
});

router.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token' });
  const db = await prisma.refreshToken.findUnique({ where: { token } });
  if (!db) return res.status(401).json({ error: 'Invalid refresh token' });
  if (db.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: db.id } });
    return res.status(401).json({ error: 'Refresh token expired' });
  }
  const user = await prisma.user.findUnique({ where: { id: db.userId } });
  if (!user) return res.status(401).json({ error: 'User not found' });

  const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });

  // Optionally rotate refresh token
  const newRefresh = makeRefreshToken();
  const newExpires = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { token: newRefresh, userId: user.id, expiresAt: newExpires } });
  // use deleteMany to avoid throwing if token was already removed concurrently
  await prisma.refreshToken.deleteMany({ where: { id: db.id } });
  res.clearCookie('refreshToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.cookie('refreshToken', newRefresh, { httpOnly: true, secure: false, sameSite: 'lax', path: '/', expires: newExpires });

  res.json({ accessToken, user: { id: user.id, name: user.name, role: user.role } });
});

router.post('/logout', async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    await prisma.refreshToken.deleteMany({ where: { token } }).catch(()=>{});
  }
  // clear both possible cookie paths
  res.clearCookie('refreshToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ ok: true });
});

export default router;
