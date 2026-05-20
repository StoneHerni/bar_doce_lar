import db from '@/lib/db';
import { 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  DollarSign,
  ArrowRight,
  ClipboardCheck,
  Bell
} from 'lucide-react';
import styles from './Dashboard.module.css';
import Link from 'next/link';
import { cookies } from 'next/headers';

// Função auxiliar para formatar valores monetários em Kwanza (Kz)
const fmt = (n: number) => Math.round(n).toLocaleString('pt-AO');

/**
 * Obtém todos os dados estatísticos e métricas necessárias para renderizar o Dashboard.
 */
async function getDashboardData() {
  const today = new Date().toISOString().split('T')[0];

  // 1. Total faturado em vendas hoje
  const salesToday = db.prepare("SELECT SUM(total) as total FROM vendas WHERE data LIKE ?").get(`${today}%`) as { total: number };
  
  // 2. Total acumulado de dívidas (fiado pendente) no sistema
  const pendingDebts = db.prepare('SELECT SUM(divida) as total FROM vendas WHERE divida > 0').get() as { total: number };
  
  // 3. Contagem de produtos ativos com stock abaixo do mínimo estipulado
  const lowStock = db.prepare('SELECT COUNT(*) as count FROM produtos WHERE estoque_atual < estoque_minimo AND ativo = 1').get() as { count: number };
  
  // 4. Contagem de clientes individuais que possuem alguma dívida pendente
  const customerCount = db.prepare(`
    SELECT COUNT(*) as count FROM clientes 
    WHERE (SELECT SUM(divida) FROM vendas WHERE cliente_id = clientes.id AND divida > 0) > 0
  `).get() as { count: number };

  // 5. Lista de clientes com prazos de pagamento de fiado expirados (vencidos hoje ou antes)
  const overdueClients = db.prepare(`
    SELECT c.nome, c.prazo_pagamento,
      IFNULL((SELECT SUM(divida) FROM vendas WHERE cliente_id = c.id AND divida > 0), 0) as divida_total
    FROM clientes c
    WHERE c.prazo_pagamento IS NOT NULL AND c.prazo_pagamento <= ? 
      AND (SELECT SUM(divida) FROM vendas WHERE cliente_id = c.id AND divida > 0) > 0
    ORDER BY c.prazo_pagamento ASC
  `).all(today) as { nome: string; prazo_pagamento: string; divida_total: number }[];  

  // 6. Últimas 5 vendas registadas no sistema
  const recentSales = db.prepare(`
    SELECT v.*, 
      (SELECT GROUP_CONCAT(vi.quantidade || 'x ' || p.nome, ', ') 
       FROM venda_itens vi 
       JOIN produtos p ON vi.produto_id = p.id 
       WHERE vi.venda_id = v.id) as produtos_vendidos
    FROM vendas v 
    ORDER BY v.id DESC LIMIT 5
  `).all() as any[];

  // 7. Lista detalhada de produtos ativos com stock abaixo do mínimo (para alertas visuais)
  const lowStockProducts = db.prepare(`
    SELECT nome, estoque_atual, estoque_minimo 
    FROM produtos 
    WHERE estoque_atual < estoque_minimo AND ativo = 1
    ORDER BY estoque_atual ASC
  `).all() as any[];

  // 8. Informações sobre o último fecho de turno feito por um funcionário
  const lastFecho = db.prepare(`
    SELECT ft.*, u.nome as funcionario_nome
    FROM fecho_turno ft
    JOIN usuarios u ON ft.funcionario_id = u.id
    ORDER BY ft.id DESC LIMIT 1
  `).get() as any;

  // 9. Itens e quantidades contadas no último fecho de turno
  let fechoItens: any[] = [];
  if (lastFecho) {
    fechoItens = db.prepare(`
      SELECT fti.*, p.nome as produto_nome
      FROM fecho_turno_itens fti
      JOIN produtos p ON fti.produto_id = p.id
      WHERE fti.fecho_id = ?
    `).all(lastFecho.id);
  }

  return {
    metrics: {
      salesToday: salesToday?.total || 0,
      pendingDebts: pendingDebts?.total || 0,
      lowStock: lowStock?.count || 0,
      customers: customerCount?.count || 0,
    },
    recentSales,
    lastFecho: lastFecho || null,
    fechoItens,
    lowStockProducts,
    overdueClients
  };
}

export default async function Dashboard() {
  const data = await getDashboardData();

  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  const user = userCookie ? JSON.parse(userCookie.value) : null;
  const funcao = user?.tipo === 'admin' ? 'Administrador' : 'Funcionário';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Olá, {user?.nome ?? 'Bem-vindo'}!</h1>
          <p>{funcao} · Bar Doce Lar</p>
        </div>
        {user?.tipo !== 'admin' && (
          <Link href="/pos" className="btn-primary">
            Nova Venda
          </Link>
        )}
      </header>

      {data.overdueClients.length > 0 && (
        <section className="glass-card" style={{ borderLeft: '4px solid var(--danger)', marginBottom: '1.5rem' }}>
          <div className={styles.sectionHeader}>
            <Bell size={20} style={{ color: 'var(--danger)' }} />
            <h2 style={{ color: 'var(--danger)' }}>Prazos de Pagamento Vencidos</h2>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Prazo</th>
                  <th>Dívida</th>
                </tr>
              </thead>
              <tbody>
                {data.overdueClients.map((c, i) => (
                  <tr key={i}>
                    <td>{c.nome}</td>
                    <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{c.prazo_pagamento}</td>
                    <td style={{ fontWeight: 600 }}>{fmt(c.divida_total)} Kz</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <Link href="/clientes" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              Ver clientes <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      )}

      <div className={styles.metricsGrid}>        <div className="glass-card">
          <div className={`${styles.iconWrapper} ${styles.sales}`}>
            <TrendingUp size={24} />
          </div>
          <div className={styles.metricInfo}>
            <span>Vendas Hoje</span>
            <h3>{fmt(data.metrics.salesToday)} Kz</h3>
          </div>
        </div>

        <div className="glass-card">
          <div className={`${styles.iconWrapper} ${styles.debts}`}>
            <DollarSign size={24} />
          </div>
          <div className={styles.metricInfo}>
            <span>Total em Fiado</span>
            <h3>{fmt(data.metrics.pendingDebts)} Kz</h3>
          </div>
        </div>

        <div className="glass-card">
          <div className={`${styles.iconWrapper} ${styles.stock}`}>
            <AlertTriangle size={24} />
          </div>
          <div className={styles.metricInfo}>
            <span>Estoque Baixo</span>
            <h3>{data.metrics.lowStock} itens</h3>
          </div>
        </div>

        <div className="glass-card">
          <div className={`${styles.iconWrapper} ${styles.customers}`}>
            <Users size={24} />
          </div>
          <div className={styles.metricInfo}>
            <span>Clientes com Dívida</span>
            <h3>{data.metrics.customers}</h3>
          </div>
        </div>
      </div>

      {data.lowStockProducts.length > 0 && (
        <section className="glass-card">
          <div className={styles.sectionHeader}>
            <AlertTriangle size={20} style={{ color: 'var(--warning)' }} />
            <h2>Produtos com Estoque Baixo</h2>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Estoque Atual</th>
                  <th>Mínimo</th>
                </tr>
              </thead>
              <tbody>
                {data.lowStockProducts.map((prod) => (
                  <tr key={prod.nome}>
                    <td>{prod.nome}</td>
                    <td style={{ color: 'var(--warning)', fontWeight: 600 }}>{prod.estoque_atual}</td>
                    <td>{prod.estoque_minimo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className={styles.mainContent}>
        <section className="glass-card">
          <div className={styles.sectionHeader}>
            <h2>Vendas Recentes</h2>
            {user?.tipo !== 'admin' && (
              <Link href="/relatorios" className={styles.viewAll}>
                Ver todas <ArrowRight size={16} />
              </Link>
            )}
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Produto(s)</th>
                  <th>Tipo</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.data}</td>
                    <td style={{ fontWeight: 500, color: 'var(--primary)' }}>{sale.produtos_vendidos || 'Consumidor'}</td>
                    <td>{sale.tipo_pagamento}</td>
                    <td>{fmt(sale.total)} Kz</td>
                    <td>
                      <span className={`${styles.badge} ${sale.divida > 0 ? styles.unpaid : styles.paid}`}>
                        {sale.divida > 0 ? 'Pendente' : 'Pago'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {data.lastFecho && (
          <section className="glass-card">
            <div className={styles.sectionHeader}>
              <h2><ClipboardCheck size={20} /> Último Fecho do Turno</h2>
              {user?.tipo !== 'admin' && (
                <Link href="/fecho" className={styles.viewAll}>
                  Novo Fecho <ArrowRight size={16} />
                </Link>
              )}
            </div>
            <div className={styles.fechoInfo}>
              <p><strong>Data:</strong> {data.lastFecho.data} | <strong>Funcionário:</strong> {data.lastFecho.funcionario_nome}</p>
              {data.lastFecho.observacao && <p><strong>Obs:</strong> {data.lastFecho.observacao}</p>}
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  {data.fechoItens.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.produto_nome}</td>
                      <td>{item.quantidade} un</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
