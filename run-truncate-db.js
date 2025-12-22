(async () => {
  try {
    console.log('Connecting to DB via backend @prisma/client...');
    const dotenv = require('dotenv');
    const path = require('path');
    const envPath = path.resolve(__dirname, 'backend', '.env');
    dotenv.config({ path: envPath });
    const { PrismaClient } = require('./backend/node_modules/@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log('Connected. Disabling foreign key checks and truncating tables...');
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=0');
    const tables = ['OrderItem','`Order`','`Table`','Feedback','Product','Category','RefreshToken','`User`','Establishment','Theme'];
    for (const t of tables) {
      try {
        console.log('Truncating', t);
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${t}`);
      } catch (e) {
        console.warn('Failed to truncate', t, e.message || e);
      }
    }
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=1');
    console.log('Truncate finished. Disconnecting...');
    await prisma.$disconnect();
    console.log('Done.');
  } catch (e) {
    console.error('Error running truncate script:', e);
    process.exit(1);
  }
})();
