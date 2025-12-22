import dotenv from 'dotenv';
dotenv.config({ path: __dirname + '/../../.env' });
import prisma from '../prisma';

async function main() {
  const argv = process.argv.slice(2);
  const args: Record<string,string> = {};
  for (const a of argv) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  const userId = args.userId || args.id || args.uid;
  const username = args.username || args.user;
  const estId = args.establishmentId || args.estId || args.eid;

  if (!estId) {
    console.error('Missing --establishmentId or --estId');
    process.exit(1);
  }

  if (!userId && !username) {
    console.error('Provide --userId or --username to identify the user');
    process.exit(1);
  }

  let user: any = null;
  if (userId) user = await prisma.user.findUnique({ where: { id: Number(userId) } });
  else if (username) user = await prisma.user.findFirst({ where: { username } });

  if (!user) {
    console.error('User not found');
    process.exit(1);
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data: { establishmentId: Number(estId) } });
  console.log(`Updated user id=${updated.id} username=${updated.username} establishmentId=${updated.establishmentId}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
