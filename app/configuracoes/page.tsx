import ConfiguracoesClient from './ConfiguracoesClient';
import db from '@/lib/db';
import { initDb } from '@/lib/db';

export default async function ConfiguracoesPage() {
  initDb();
  
  const config = db.prepare('SELECT * FROM configuracoes WHERE id = 1').get() as any;
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