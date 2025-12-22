import prisma from '../../prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ path: 'backend/.env' });

async function main() {
  const username = process.argv[2] || 'superadmin';
  const password = process.argv[3] || 'change_me_secure_password';
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log('User already exists:', existing.id);
    console.log('If you want to use as SUPER_ADMIN_USER_ID set it to:', existing.id);
    process.exit(0);
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name: 'Super Admin', username, password: hashed, role: 'superadmin' } });
  console.log('Created superadmin user id=', user.id);
  console.log('Set environment variable SUPER_ADMIN_USER_ID=' + user.id);
  // create token
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'changeme', { expiresIn: '7d' });
  console.log('JWT token (7d):', token);
}

main().catch((e) => { console.error(e); process.exit(1); });
