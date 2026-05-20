'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function registerMovement(tipo: string, descricao: string, valor: number) {
  const today = new Date().toISOString().split('T')[0];

  try {
    db.prepare('INSERT INTO caixa (data, descricao, tipo, valor) VALUES (?, ?, ?, ?)')
      .run(today, descricao, tipo, valor);
    
    revalidatePath('/relatorios');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDailyReportData(date: string) {
  try {
    // Obter todos os produtos ativos
    const products = db.prepare(`
      SELECT DISTINCT p.id, p.nome, p.estoque_atual, p.preco, p.garrafas_por_grade,
             COALESCE(pp.preco_venda, p.preco) as preco_venda
      FROM produtos p
      LEFT JOIN pos_produtos pp ON pp.produto_id = p.id
      WHERE p.ativo = 1
      ORDER BY p.nome
    `).all() as any[];

    const reportData = [];

    for (const p of products) {
      // Calcular vendas desde o início do dia 'date' até hoje
      const vendasDesde = db.prepare(`
        SELECT COALESCE(SUM(vi.quantidade), 0) as total
        FROM venda_itens vi
        JOIN vendas v ON v.id = vi.venda_id
        WHERE vi.produto_id = ? AND v.data >= ?
      `).get(p.id, date) as { total: number };

      // Calcular perdas desde o início do dia 'date' até hoje
      const perdasDesde = db.prepare(`
        SELECT COALESCE(SUM(quantidade), 0) as total
        FROM perdas
        WHERE produto_id = ? AND data >= ?
      `).get(p.id, date) as { total: number };

      // Calcular compras desde o início do dia 'date' até hoje
      const comprasDesde = db.prepare(`
        SELECT COALESCE(SUM(ci.quantidade_grade * p.garrafas_por_grade + ci.quantidade_garrafas), 0) as total
        FROM compra_itens ci
        JOIN compras c ON c.id = ci.compra_id
        JOIN produtos p ON p.id = ci.produto_id
        WHERE ci.produto_id = ? AND c.data >= ?
      `).get(p.id, date) as { total: number };

      // Estoque Inicial no início do dia 'date'
      const estoqueInicial = p.estoque_atual + vendasDesde.total + perdasDesde.total - comprasDesde.total;

      // Vendas no dia 'date'
      const vendaPronto = db.prepare(`
        SELECT COALESCE(SUM(vi.quantidade), 0) as total
        FROM venda_itens vi
        JOIN vendas v ON v.id = vi.venda_id
        WHERE vi.produto_id = ? AND v.data = ? AND v.tipo_pagamento != 'fiado'
      `).get(p.id, date) as { total: number };

      const vendaPrazo = db.prepare(`
        SELECT COALESCE(SUM(vi.quantidade), 0) as total
        FROM venda_itens vi
        JOIN vendas v ON v.id = vi.venda_id
        WHERE vi.produto_id = ? AND v.data = ? AND v.tipo_pagamento = 'fiado'
      `).get(p.id, date) as { total: number };

      // Perdas no dia 'date'
      const perdaDia = db.prepare(`
        SELECT COALESCE(SUM(quantidade), 0) as total
        FROM perdas
        WHERE produto_id = ? AND data = ?
      `).get(p.id, date) as { total: number };

      // Total faturado no dia 'date'
      const totalFaturado = db.prepare(`
        SELECT COALESCE(SUM(vi.quantidade * vi.preco_unitario), 0) as total
        FROM venda_itens vi
        JOIN vendas v ON v.id = vi.venda_id
        WHERE vi.produto_id = ? AND v.data = ?
      `).get(p.id, date) as { total: number };

      // Obter quantidade de fecho do turno na data selecionada
      const fechoItem = db.prepare(`
        SELECT fti.quantidade, fti.quantidade_prateleira, fti.quantidade_arca
        FROM fecho_turno_itens fti
        JOIN fecho_turno ft ON ft.id = fti.fecho_id
        WHERE fti.produto_id = ? AND ft.data = ?
        ORDER BY ft.created_at DESC
        LIMIT 1
      `).get(p.id, date) as { quantidade: number; quantidade_prateleira: number; quantidade_arca: number } | undefined;

      reportData.push({
        produto: p.nome,
        stock: estoqueInicial,
        preco: p.preco_venda,
        restouPrateleira: fechoItem ? fechoItem.quantidade_prateleira : null,
        restouArca: fechoItem ? fechoItem.quantidade_arca : null,
        restouTotal: fechoItem ? fechoItem.quantidade : null,
        vendaPronto: vendaPronto.total,
        vendaPrazo: vendaPrazo.total,
        perda: perdaDia.total,
        total: totalFaturado.total
      });
    }

    return { success: true, data: reportData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
