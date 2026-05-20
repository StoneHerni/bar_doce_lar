'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  FileBarChart, 
  Settings,
  Wine,
  LogOut,
  UserCog,
  Sun,
  Moon,
  ClipboardCheck,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutGrid,
  Truck,
} from 'lucide-react';
import styles from './Sidebar.module.css';
import { logout } from '@/app/login/actions';
import { useRouter } from 'next/navigation';
import { useTheme } from './ThemeContext';

interface User {
  id: number;
  nome: string;
  email: string;
  tipo: 'admin' | 'funcionario';
}

interface SidebarProps {
  user: User;
  isOpen: boolean;
  onToggle: () => void;
}

const adminMenu = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Package, label: 'Estoque', href: '/estoque' },
  { icon: LayoutGrid, label: 'Compra', href: '/grades' },
  { icon: Wine, label: 'Adicionar Bebida', href: '/adicionar-bebida' },
  { icon: Truck, label: 'Fornecedores', href: '/fornecedores' },
  { icon: Users, label: 'Clientes com Dívida', href: '/clientes' },
  { icon: FileBarChart, label: 'Relatórios', href: '/relatorios' },
  { icon: UserCog, label: 'Funcionários', href: '/funcionarios' },
  { icon: ClipboardCheck, label: 'Histórico de Fechos', href: '/fecho/historico' },
  { icon: Settings, label: 'Configurações', href: '/configuracoes' },
];

const funcMenu = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: ShoppingCart, label: 'Vendas (POS)', href: '/pos' },
  { icon: Package, label: 'Ver Estoque', href: '/estoque' },
  { icon: Users, label: 'Clientes com Dívida', href: '/clientes' },
  { icon: ClipboardCheck, label: 'Fecho do Turno', href: '/fecho' },
];

export default function Sidebar({ user, isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const menuItems = user.tipo === 'admin' ? adminMenu : funcMenu;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <aside className={`${styles.sidebar} ${!isOpen ? styles.collapsed : ''}`}>
      <div className={styles.topBar}>
        {isOpen && (
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <Wine size={24} color="var(--primary)" />
            </div>
            <div>
              <h1>BAR DOCE LAR</h1>
              <span>{user.tipo === 'admin' ? 'Administrador' : 'Funcionário'}</span>
            </div>
          </div>
        )}
        <button className={styles.toggleBtn} onClick={onToggle} title={isOpen ? 'Fechar menu' : 'Abrir menu'}>
          {isOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>
      </div>

      {isOpen && (
        <div className={styles.userInfo}>
          <span className={styles.userName}>{user.nome}</span>
        </div>
      )}

      <nav className={styles.nav}>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''} ${!isOpen ? styles.iconOnly : ''}`}
              title={!isOpen ? item.label : undefined}
            >
              <item.icon size={20} />
              {isOpen && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <button
          className={`${styles.navItem} ${!isOpen ? styles.iconOnly : ''}`}
          onClick={toggleTheme}
          title={!isOpen ? (theme === 'dark' ? 'Modo Claro' : 'Modo Escuro') : undefined}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          {isOpen && <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>}
        </button>
        <button
          className={`${styles.navItem} ${!isOpen ? styles.iconOnly : ''}`}
          onClick={handleLogout}
          title={!isOpen ? 'Sair' : undefined}
        >
          <LogOut size={20} />
          {isOpen && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
