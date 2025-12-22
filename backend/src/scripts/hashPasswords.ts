import dotenv from 'dotenv';
dotenv.config({ path: __dirname + '/../../.env' });
import prisma from '../prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Scanning users to hash plaintext passwords...');
  const users = await prisma.user.findMany({ select: { id: true, password: true, username: true } });
  let updated = 0;
  for (const u of users) {
    const pwd = u.password || '';
    if (!pwd) continue; // no password set
    // bcrypt hashes start with $2a$, $2b$, $2y$ typically
    if (pwd.startsWith('$2')) continue; // already hashed
    try {
      const hash = await bcrypt.hash(pwd, 10);
      await prisma.user.update({ where: { id: u.id }, data: { password: hash } });
      console.log(`Hashed password for user ${u.username} (id=${u.id})`);
      updated++;
    } catch (e) {
      console.error(`Failed to hash for user id=${u.id}`, e);
    }
  }
  console.log(`Done. ${updated} users updated.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
