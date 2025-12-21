import prisma from '../prisma';
import { Request, Response } from 'express';

/**
 * Controlador para operações relacionadas ao estabelecimento
 */
export default {
  /**
   * Busca o primeiro estabelecimento, incluindo tema e usuário admin
   */
  async getEstablishment(req: Request, res: Response) {
    const estabelecimento = await prisma.establishment.findFirst({ include: { theme: true, adminUser: true } });
    res.json(estabelecimento);
  },

  /**
   * Cria um novo estabelecimento (apenas admin)
   */
  async createEstablishment(req: Request, res: Response) {
    const { name, address, cep, cpfCnpj, logo, serviceCharge, theme } = req.body;
    const themeData = theme || { background: '#06120c', card: '#0d1f15', text: '#fefce8', primary: '#d18a59', accent: '#c17a49' };
    const createdTheme = await prisma.theme.create({ data: { ...themeData } }).catch(() => null);
    const estabelecimento = await prisma.establishment.create({ data: { name, address, cep, cpfCnpj, logo, serviceCharge: Number(serviceCharge || 10), themeId: createdTheme?.id } });
    res.json(estabelecimento);
  },

  /**
   * Atualiza um estabelecimento pelo ID (apenas admin)
   */
  async updateEstablishmentById(req: Request, res: Response) {
    const id = Number(req.params.id);
    const data = req.body;
    const atualizado = await prisma.establishment.update({ where: { id }, data });
    res.json(atualizado);
  },

  /**
   * Atualiza o primeiro estabelecimento encontrado (útil para sincronização do frontend)
   */
  async updateFirstEstablishment(req: Request, res: Response) {
    const data = req.body || {};
    const themePayload = data.theme;
    // Remove o tema do payload para evitar erro de objeto aninhado no Prisma
    if (themePayload) delete data.theme;
    // Lista de campos permitidos para atualização
    const allowedFields = ['name', 'address', 'cep', 'cpfCnpj', 'logo', 'serviceCharge', 'adminUserId'];
    const payload: any = {};
    for (const k of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(data, k) && data[k] !== undefined) payload[k] = data[k];
    }
    let estabelecimento = await prisma.establishment.findFirst();
    if (estabelecimento) {
      // Atualiza campos do estabelecimento (sem o tema)
      const atualizado = await prisma.establishment.update({ where: { id: estabelecimento.id }, data: payload });
      // Atualiza ou cria o tema separadamente
      if (themePayload) {
        if (estabelecimento.themeId) {
          await prisma.theme.update({ where: { id: estabelecimento.themeId }, data: themePayload }).catch(() => null);
        } else {
          const t = await prisma.theme.create({ data: themePayload }).catch(() => null);
          if (t) await prisma.establishment.update({ where: { id: estabelecimento.id }, data: { themeId: t.id } }).catch(() => null);
        }
      }
      const fresh = await prisma.establishment.findUnique({ where: { id: estabelecimento.id }, include: { theme: true } });
      return res.json(fresh);
    }
    // Cria novo tema se fornecido
    let themeId = null as number | null;
    if (themePayload) {
      const t = await prisma.theme.create({ data: themePayload }).catch(() => null);
      themeId = t?.id ?? null;
    }
    const createPayload: any = {};
    for (const k of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(data, k) && data[k] !== undefined) createPayload[k] = data[k];
    }
    createPayload.themeId = themeId;
    const criado = await prisma.establishment.create({ data: { ...createPayload } });
    res.json(criado);
  }
};
