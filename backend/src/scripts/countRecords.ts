import prisma from '../prisma';

async function main(){
  const counts: any = {};
  counts.themes = await prisma.theme.count().catch(()=>0);
  counts.establishments = await prisma.establishment.count().catch(()=>0);
  counts.users = await prisma.user.count().catch(()=>0);
  counts.categories = await prisma.category.count().catch(()=>0);
  counts.products = await prisma.product.count().catch(()=>0);
  counts.tables = await prisma.table.count().catch(()=>0);
  counts.orders = await prisma.order.count().catch(()=>0);
  counts.orderItems = await prisma.orderItem.count().catch(()=>0);
  counts.feedbacks = await prisma.feedback.count().catch(()=>0);
  counts.refreshTokens = await prisma.refreshToken.count().catch(()=>0);
  console.log('Record counts:', counts);
}

main().catch(e=>{ console.error(e); process.exit(1); }).finally(async ()=>{ await prisma.$disconnect(); });
