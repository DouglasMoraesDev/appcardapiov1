import prisma from '../prisma';
import { Request, Response } from 'express';

/**
 * Controlador para operações relacionadas às categorias
 */
export default {
  /**
   * Lista todas as categorias com seus produtos
   */
  async listarCategorias(req: Request, res: Response) {
    const categorias = await prisma.category.findMany({ include: { products: true } });
    res.json(categorias);
  },

  /**
   * Cria uma nova categoria (apenas admin)
   */
  async criarCategoria(req: Request, res: Response) {
    const { name } = req.body;
    const categoria = await prisma.category.create({ data: { name } });
    res.json(categoria);
  },

  /**
   * Atualiza uma categoria pelo ID (apenas admin)
   */
  async atualizarCategoria(req: Request, res: Response) {
    const id = Number(req.params.id);
    const { name } = req.body;
    const atualizada = await prisma.category.update({ where: { id }, data: { name } });
    res.json(atualizada);
  },


  /**
   * Remove uma categoria pelo ID (apenas admin)
   */
  async removerCategoria(req: Request, res: Response) {
    const id = Number(req.params.id);
    // Opcional: mover produtos para uma categoria padrão antes de deletar
    await prisma.category.delete({ where: { id } });
    res.json({ ok: true });
  }
};


