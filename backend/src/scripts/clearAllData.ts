import prisma from '../prisma';

async function main(){
  console.log('Clearing all data from database...');

  // Delete child tables first
  await prisma.orderItem.deleteMany().catch(()=>{});
  await prisma.order.deleteMany().catch(()=>{});
  await prisma.refreshToken.deleteMany().catch(()=>{});
  await prisma.feedback.deleteMany().catch(()=>{});
  await prisma.product.deleteMany().catch(()=>{});
  await prisma.category.deleteMany().catch(()=>{});
  await prisma.table.deleteMany().catch(()=>{});
  await prisma.user.deleteMany().catch(()=>{});
  await prisma.establishment.deleteMany().catch(()=>{});
  await prisma.theme.deleteMany().catch(()=>{});

  console.log('All data cleared.');
}

main().catch(e=>{ console.error(e); process.exit(1); }).finally(async ()=>{ await prisma.$disconnect(); });
