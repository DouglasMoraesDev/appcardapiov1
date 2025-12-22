(async () => {
  try {
    const { PrismaClient } = require('./backend/node_modules/@prisma/client');
    const dotenv = require('dotenv');
    const path = require('path');
    dotenv.config({ path: path.resolve(__dirname, 'backend', '.env') });
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log('Creating view `orders` as SELECT * FROM `Order` ...');
    await prisma.$executeRawUnsafe('CREATE OR REPLACE VIEW `orders` AS SELECT * FROM `Order`');
    console.log('View created.');
    await prisma.$disconnect();
  } catch (e) {
    console.error('Error creating view:', e.message || e);
    process.exit(1);
  }
})();
