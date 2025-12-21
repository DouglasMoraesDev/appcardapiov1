import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  const tables = await prisma.table.findMany();
  res.json(tables);
});

router.post('/', async (req, res) => {
  const { number, status } = req.body;
  try {
    const t = await prisma.table.create({ data: { number: Number(number), status: status || 'AVAILABLE' } });
    res.json(t);
  } catch (error: any) {
    if (error.code === 'P2002') {
      // Erro de chave única (mesa já existe)
      res.status(409).json({ error: 'Mesa com esse número já existe.' });
    } else {
      res.status(500).json({ error: 'Erro ao criar mesa', details: error.message });
    }
  }
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const data = req.body;
  const servicePaidFlag = req.body.servicePaid as boolean | undefined;
  // build a clean payload with only allowed table fields to avoid Prisma errors
  const allowed = ['status', 'number'];
  const payload: any = {};
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(data, k) && data[k] !== undefined) payload[k] = data[k];
  }
  try {
    // fetch current table to determine status transition
    const current = await prisma.table.findUnique({ where: { id } });
    const updated = await prisma.table.update({ where: { id }, data: payload });
    // If table became AVAILABLE, mark its orders as PAID
    if (data && data.status === 'AVAILABLE') {
      const orders = await prisma.order.findMany({ where: { tableId: id, NOT: { status: 'PAID' } } });
      const est = await prisma.establishment.findFirst();
      const serviceCharge = est?.serviceCharge ?? 0;
      for (const o of orders) {
        const serviceValue = Number(((o.total || 0) * (serviceCharge / 100)).toFixed(2));
        const svcVal = servicePaidFlag ? serviceValue : 0;
        await prisma.order.update({ where: { id: o.id }, data: { status: 'PAID', servicePaid: !!servicePaidFlag, serviceValue: svcVal } }).catch(() => null);
      }
    }
    // If table transitioned from AVAILABLE -> OCCUPIED, ensure previous non-PAID orders are closed
    if (current && current.status === 'AVAILABLE' && data && data.status === 'OCCUPIED') {
      await prisma.order.updateMany({ where: { tableId: id, NOT: { status: 'PAID' } }, data: { status: 'PAID' } }).catch(() => null);
    }
    // fetch updated orders for this table (including PAID) so frontend can display service values
    const updatedOrders = await prisma.order.findMany({ where: { tableId: id }, include: { items: true } });
    return res.json({ updated, orders: updatedOrders });
  } catch (error: any) {
    return res.status(500).json({ error: 'Erro ao atualizar mesa', details: error.message });
  }
});

// Atualiza o status de uma mesa
router.post('/status', async (req, res) => {
  const { id, status } = req.body;
  const servicePaidFlag = req.body.servicePaid as boolean | undefined;
  if (!id || !status) {
    return res.status(400).json({ error: 'id e status são obrigatórios' });
  }
  try {
    const current = await prisma.table.findUnique({ where: { id: Number(id) } });
    const updated = await prisma.table.update({ where: { id: Number(id) }, data: { status } });
    // If table is being set to AVAILABLE, mark orders as PAID
    if (status === 'AVAILABLE') {
      const orders = await prisma.order.findMany({ where: { tableId: Number(id), NOT: { status: 'PAID' } } });
      const est = await prisma.establishment.findFirst();
      const serviceCharge = est?.serviceCharge ?? 0;
      for (const o of orders) {
        const serviceValue = Number(((o.total || 0) * (serviceCharge / 100)).toFixed(2));
        const svcVal = servicePaidFlag ? serviceValue : 0;
        await prisma.order.update({ where: { id: o.id }, data: { status: 'PAID', servicePaid: !!servicePaidFlag, serviceValue: svcVal } }).catch(() => null);
      }
    }
    // If transitioning AVAILABLE -> OCCUPIED, mark previous non-PAID orders as PAID to avoid reusing old consumption
    if (current && current.status === 'AVAILABLE' && status === 'OCCUPIED') {
      await prisma.order.updateMany({ where: { tableId: Number(id), NOT: { status: 'PAID' } }, data: { status: 'PAID' } }).catch(() => null);
    }
    return res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar status da mesa', details: error });
  }
});

export default router;
