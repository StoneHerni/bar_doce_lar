'use server';

import { all, get, run, exec, transaction, initDb } from '@/lib/db';

export interface Configuracoes {
  estoque_minimo_padrao: number;
  limite_fiado_padrao: number;
  nome_empresa: string;
}

export async function getConfiguracoes(): Promise<Configuracoes> {
  const config = await get('SELECT * FROM configuracoes WHERE id = 1') as any;
  
  if (!config) {
    const defaultConfig: Configuracoes = {
      estoque_minimo_padrao: 10,
      limite_fiado_padrao: 5000,
      nome_empresa: 'Bar Doce Lar'
    };
    await run('INSERT INTO configuracoes (estoque_minimo_padrao, limite_fiado_padrao, nome_empresa) VALUES (?, ?, ?)',
      [defaultConfig.estoque_minimo_padrao, defaultConfig.limite_fiado_padrao, defaultConfig.nome_empresa]);
    return defaultConfig;
  }
  
  return {
    estoque_minimo_padrao: config.estoque_minimo_padrao,
    limite_fiado_padrao: config.limite_fiado_padrao,
    nome_empresa: config.nome_empresa
  };
}

export async function salvarConfiguracoes(data: Configuracoes) {
  await run(`
    UPDATE configuracoes 
    SET estoque_minimo_padrao = ?, limite_fiado_padrao = ?, nome_empresa = ?
    WHERE id = 1
  `, [data.estoque_minimo_padrao, data.limite_fiado_padrao, data.nome_empresa]);
  
  return { success: true };
}

export async function aplicarEstoqueMinimoPadrao() {
  const config = await getConfiguracoes();
  await run('UPDATE produtos SET estoque_minimo = ?', [config.estoque_minimo_padrao]);
  return { success: true, message: `Aplicado ${config.estoque_minimo_padrao} a todos os produtos` };
}