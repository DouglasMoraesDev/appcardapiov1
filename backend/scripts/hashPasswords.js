const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/../.env' });

const prisma = new PrismaClient();

(async function main(){
  try{
    console.log('Scanning users to hash plaintext passwords...');
    const users = await prisma.user.findMany({ select: { id: true, password: true, username: true } });
    let updated = 0;
    for (const u of users) {
      const pwd = u.password || '';
      if (!pwd) continue;
      if (pwd.startsWith('$2')) continue; // already hashed
      try {
        const hash = await bcrypt.hash(pwd, 10);
        await prisma.user.update({ where: { id: u.id }, data: { password: hash } });
        console.log(`Hashed password for user ${u.username} (id=${u.id})`);
        updated++;
      } catch (e) {
        console.error(`Failed to hash for user id=${u.id}`, e.message || e);
      }
    }
    console.log(`Done. ${updated} users updated.`);
  } catch (e){
    console.error('Fatal error running hash script', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
