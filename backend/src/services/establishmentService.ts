import prisma from '../prisma';

/**
 * Serviço para operações de estabelecimento
 */
export default {
  async buscarPrimeiroEstabelecimento() {
    return prisma.establishment.findFirst({ include: { theme: true, adminUser: true } });
  },
  async criarEstabelecimento(data: any, themeData: any) {
    const createdTheme = await prisma.theme.create({ data: { ...themeData } }).catch(() => null);
    return prisma.establishment.create({ data: { ...data, serviceCharge: Number(data.serviceCharge || 10), themeId: createdTheme?.id } });
  },
  async atualizarEstabelecimentoPorId(id: number, data: any) {
    return prisma.establishment.update({ where: { id }, data });
  },
  async atualizarPrimeiroEstabelecimento(payload: any, themePayload: any) {
    let estabelecimento = await prisma.establishment.findFirst();
    if (estabelecimento) {
      const atualizado = await prisma.establishment.update({ where: { id: estabelecimento.id }, data: payload });
      if (themePayload) {
        if (estabelecimento.themeId) {
          await prisma.theme.update({ where: { id: estabelecimento.themeId }, data: themePayload }).catch(() => null);
        } else {
          const t = await prisma.theme.create({ data: themePayload }).catch(() => null);
          if (t) await prisma.establishment.update({ where: { id: estabelecimento.id }, data: { themeId: t.id } }).catch(() => null);
        }
      }
      return prisma.establishment.findUnique({ where: { id: estabelecimento.id }, include: { theme: true } });
    }
    // Cria novo tema se fornecido
    let themeId = null as number | null;
    if (themePayload) {
      const t = await prisma.theme.create({ data: themePayload }).catch(() => null);
      themeId = t?.id ?? null;
    }
    payload.themeId = themeId;
    return prisma.establishment.create({ data: { ...payload } });
  }
};
