'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { ThemeProvider } from '@/components/ThemeContext';
import { ToastProvider } from '@/components/Toast';

interface User {
  id: number;
  nome: string;
  email: string;
  tipo: 'admin' | 'funcionario';
}

export default function ClientLayout({ children, user }: { children: React.ReactNode; user: User | null }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('sidebarOpen');
    if (saved !== null) setSidebarOpen(saved === 'true');
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      localStorage.setItem('sidebarOpen', String(!prev));
      return !prev;
    });
  };

  const sidebarWidth = sidebarOpen ? 280 : 72;

  return (
    <ThemeProvider>
      <ToastProvider>
        <div style={{ display: 'flex' }}>
          {user ? (
            <>
              <Sidebar user={user} isOpen={sidebarOpen} onToggle={toggleSidebar} />
              <main style={{
                marginLeft: `${sidebarWidth}px`,
                width: `calc(100% - ${sidebarWidth}px)`,
                minHeight: '100vh',
                padding: '2.5rem',
                transition: 'margin-left 0.3s ease, width 0.3s ease',
              }}>
                {children}
              </main>
            </>
          ) : (
            <main style={{ width: '100%', minHeight: '100vh' }}>
              {children}
            </main>
          )}
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}
