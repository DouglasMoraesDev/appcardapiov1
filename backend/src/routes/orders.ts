import { Router } from 'express';
import prisma from '../prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Endpoint para relatório de mesas fechadas do dia
router.get('/closed-today', authenticate, authorize(['admin']), async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  // Busca pedidos com status PAID ou DELIVERED do dia
  const closedOrders = await prisma.order.findMany({
    where: {
      status: { in: ['PAID', 'DELIVERED'] },
      timestamp: { gte: startOfDay, lte: endOfDay }
    },
    include: { items: true, table: true }
  });
  // Agrupa por mesa
  type Group = { tableNumber?: number; orders: any[]; total: number };
  const report: Record<string, Group> = {};
  for (const order of closedOrders) {
    const tid = String(order.tableId);
    if (!report[tid]) report[tid] = { tableNumber: order.table.number, orders: [], total: 0 };
    report[tid].orders.push(order);
    report[tid].total += Number(order.total || 0);
  }
  res.json(Object.values(report));
});

router.get('/', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  let user = null;
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'changeme');
      user = decoded;
    } catch {}
  }

  const tableId = req.query.tableId;
  if (tableId) {
    // If a tableId is provided, return orders for that table.
    // By default do NOT include PAID orders to avoid resurfacing old closed consumption.
    // Admins can explicitly request paid orders with ?includePaid=true
    const includePaid = String(req.query.includePaid || '').toLowerCase() === 'true';
    if (!user) {
      const orders = await prisma.order.findMany({ where: { tableId: Number(tableId), NOT: { status: 'PAID' } }, include: { items: true } });
      return res.json(orders);
    }
    // Authenticated users may request paid orders explicitly
    const where = includePaid ? { tableId: Number(tableId) } : { tableId: Number(tableId), NOT: { status: 'PAID' } };
    const orders = await prisma.order.findMany({ where, include: { items: true } });
    return res.json(orders);
  }

  // No tableId: only staff may request the full list
  if (user && (user.role === 'admin' || user.role === 'waiter')) {
    const orders = await prisma.order.findMany({ include: { items: true } });
    return res.json(orders);
  }

  return res.status(403).json({ error: 'Acesso negado' });
});

router.post('/', async (req, res) => {
  const { tableId, items, status, total, paymentMethod } = req.body;
  const order = await prisma.order.create({
    data: {
      tableId: Number(tableId),
      status: status || 'PENDING',
      total: Number(total) || 0,
      paymentMethod: paymentMethod || null,
      items: { create: items.map((it: any) => ({ productId: it.productId ? Number(it.productId) : undefined, quantity: Number(it.quantity), name: it.name, price: Number(it.price), status: it.status || 'PENDING', observation: it.observation || null })) }
    },
    include: { items: true }
  });
  res.json(order);
});

router.put('/:id/status', authenticate, authorize(['admin','waiter']), async (req, res) => {
  const id = Number(req.params.id);
  const { status, servicePaid } = req.body as { status: string; servicePaid?: boolean };
  try {
    if (status === 'PAID') {
      const ord = await prisma.order.findUnique({ where: { id } });
      if (!ord) return res.status(404).json({ error: 'Order not found' });
      // get establishment serviceCharge
      const est = await prisma.establishment.findFirst();
      const serviceCharge = est?.serviceCharge ?? 0;
      const serviceValue = Number(((ord.total || 0) * (serviceCharge / 100)).toFixed(2));
      const updated = await prisma.order.update({ where: { id }, data: { status, servicePaid: !!servicePaid, serviceValue: servicePaid ? serviceValue : 0 } });
      return res.json(updated);
    }
    const updated = await prisma.order.update({ where: { id }, data: { status } });
    return res.json(updated);
  } catch (err: any) {
    console.error('PUT /orders/:id/status error', err);
    return res.status(500).json({ error: 'Failed to update order status' });
  }
});

router.put('/:id/items/:itemId/status', authenticate, authorize(['admin','waiter']), async (req, res) => {
  const id = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  const { status } = req.body;
  const updatedItem = await prisma.orderItem.update({ where: { id: itemId }, data: { status } });
  try {
    // Recalculate parent order status based on its items
    const items = await prisma.orderItem.findMany({ where: { orderId: id } });
    const allDelivered = items.length > 0 && items.every(i => i.status === 'DELIVERED');
    const anyDelivered = items.some(i => i.status === 'DELIVERED');
    let newStatus = 'PENDING';
    if (allDelivered) newStatus = 'DELIVERED';
    else if (anyDelivered) newStatus = 'PARTIAL';
    await prisma.order.update({ where: { id }, data: { status: newStatus } });
    const orderWithItems = await prisma.order.findUnique({ where: { id }, include: { items: true } });
    return res.json(orderWithItems);
  } catch (err) {
    console.error('Failed to recalc order status after item update', err);
    return res.json(updatedItem);
  }
});

export default router;
