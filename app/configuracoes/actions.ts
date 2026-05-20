'use server';

import db from '@/lib/db';

export interface Configuracoes {
  estoque_minimo_padrao: number;
  limite_fiado_padrao: number;
  nome_empresa: string;
}

export async function getConfiguracoes(): Promise<Configuracoes> {
  const config = db.prepare('SELECT * FROM configuracoes WHERE id = 1').get() as any;
  
  if (!config) {
    const defaultConfig: Configuracoes = {
      estoque_minimo_padrao: 10,
      limite_fiado_padrao: 5000,
      nome_empresa: 'Bar Doce Lar'
    };
    db.prepare('INSERT INTO configuracoes (estoque_minimo_padrao, limite_fiado_padrao, nome_empresa) VALUES (?, ?, ?)')
      .run(defaultConfig.estoque_minimo_padrao, defaultConfig.limite_fiado_padrao, defaultConfig.nome_empresa);
    return defaultConfig;
  }
  
  return {
    estoque_minimo_padrao: config.estoque_minimo_padrao,
    limite_fiado_padrao: config.limite_fiado_padrao,
    nome_empresa: config.nome_empresa
  };
}

export async function salvarConfiguracoes(data: Configuracoes) {
  db.prepare(`
    UPDATE configuracoes 
    SET estoque_minimo_padrao = ?, limite_fiado_padrao = ?, nome_empresa = ?
    WHERE id = 1
  `).run(data.estoque_minimo_padrao, data.limite_fiado_padrao, data.nome_empresa);
  
  return { success: true };
}

export async function aplicarEstoqueMinimoPadrao() {
  const config = await getConfiguracoes();
  db.prepare('UPDATE produtos SET estoque_minimo = ?')
    .run(config.estoque_minimo_padrao);
  return { success: true, message: `Aplicado ${config.estoque_minimo_padrao} a todos os produtos` };
}