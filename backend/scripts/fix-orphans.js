#!/usr/bin/env node
/**
 * Fix orphaned records by assigning an establishmentId when missing.
 * Usage:
 *   node scripts/fix-orphans.js [establishmentId]
 * If no id provided, the script picks the first establishment in the DB.
 */
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').resolve(__dirname, '..', '..', '.env') });

const prisma = new PrismaClient();

async function main() {
  try {
    let targetId = process.argv[2] ? Number(process.argv[2]) : null;
    if (targetId && Number.isNaN(targetId)) targetId = null;
    if (!targetId) {
      const first = await prisma.establishment.findFirst();
      if (!first) {
        console.error('No establishment found. Create one first or pass an establishmentId.');
        process.exit(1);
      }
      targetId = first.id;
      console.log('No establishmentId provided — using first establishment id=', targetId);
    }

    // Products
    const products = await prisma.product.findMany({ where: { establishmentId: null } });
    console.log('Orphan products found:', products.length);
    if (products.length > 0) {
      const updated = await prisma.product.updateMany({ where: { establishmentId: null }, data: { establishmentId: targetId } });
      console.log('Products updated:', updated.count);
    }

    // Categories
    const cats = await prisma.category.findMany({ where: { establishmentId: null } });
    console.log('Orphan categories found:', cats.length);
    if (cats.length > 0) {
      const updated = await prisma.category.updateMany({ where: { establishmentId: null }, data: { establishmentId: targetId } });
      console.log('Categories updated:', updated.count);
    }

    // Tables
    const tables = await prisma.table.findMany({ where: { establishmentId: null } });
    console.log('Orphan tables found:', tables.length);
    if (tables.length > 0) {
      const updated = await prisma.table.updateMany({ where: { establishmentId: null }, data: { establishmentId: targetId } });
      console.log('Tables updated:', updated.count);
    }

    // Users (skip superadmin role)
    const users = await prisma.user.findMany({ where: { establishmentId: null, NOT: { role: 'superadmin' } } });
    console.log('Orphan users found (excluding superadmin):', users.length);
    if (users.length > 0) {
      const updated = await prisma.user.updateMany({ where: { establishmentId: null, NOT: { role: 'superadmin' } }, data: { establishmentId: targetId } });
      console.log('Users updated:', updated.count);
    }

    console.log('Done.');
  } catch (e) {
    console.error('Error', e && e.message ? e.message : e);
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
}

main();
