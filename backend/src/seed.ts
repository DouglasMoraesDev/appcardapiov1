import prisma from './prisma';

async function main(){
  console.log('Seeding database...');

  // Seed theme
  const theme = await prisma.theme.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      background: '#06120c',
      card: '#0d1f15',
      text: '#fefce8',
      primary: '#d18a59',
      accent: '#c17a49'
    }
  });


  // Seed admin user
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { name: 'Administrador Master' },
    create: { name: 'Administrador Master', username: 'admin', password: 'admin', role: 'admin' }
  });

  // Seed waiter user
  const waiter = await prisma.user.upsert({
    where: { username: 'douglas' },
    update: { name: 'Douglas' },
    create: { name: 'Douglas', username: 'douglas', password: '1234', role: 'waiter' }
  });

  // Seed establishment
  const est = await prisma.establishment.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Playpub Campos do Jordão',
      logo: 'https://cervejacamposdojordao.com.br/wp-content/uploads/2021/08/logo-playpub.png',
      address: 'Vila Capivari, Campos do Jordão',
      serviceCharge: 10,
      adminUserId: admin.id,
      themeId: theme.id
    }
  });

  // Seed categories
  const categories = ['Cervejas', 'Pratos', 'Porções', 'Drinks', 'Sobremesas'];
  for(const name of categories){
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  // Seed products
  const p1 = await prisma.product.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Cerveja Artesanal Lager', description: 'Leve, refrescante e dourada. 500ml', price: 28.0, image: 'https://cervejacamposdojordao.com.br/wp-content/uploads/2021/08/lager-campos-do-jordao.jpg', categoryId: 1, isHighlight: true }
  });

  const p2 = await prisma.product.upsert({
    where: { id: 2 },
    update: {},
    create: { name: 'Hambúrguer Playpub', description: 'Blend especial 180g, queijo cheddar e bacon.', price: 42.0, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1000&auto=format&fit=crop', categoryId: 2, isHighlight: true }
  });

  // Seed tables 1..10
  for(let i=1;i<=10;i++){
    await prisma.table.upsert({ where: { number: i }, update: {}, create: { number: i, status: 'AVAILABLE' } });
  }

  console.log('Seeding finished.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
