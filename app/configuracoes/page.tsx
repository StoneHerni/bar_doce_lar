import ConfiguracoesClient from './ConfiguracoesClient';
import { all, get, run, exec, transaction, initDb } from '@/lib/db';

export default async function ConfiguracoesPage() {
  await initDb();
  
  const config = await get('SELECT * FROM configuracoes WHERE id = 1') as any;
  const settings = config || {
    estoque_minimo_padrao: 10,
    limite_fiado_padrao: 5000,
    nome_empresa: 'Bar Doce Lar'
  };

  return (
    <ConfiguracoesClient 
      settings={settings} 
    />
  );
}