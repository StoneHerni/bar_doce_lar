import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "./ClientLayout";
import { initDb } from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

try { initDb(); } catch (e) { console.error('initDb error:', e); }

interface User {
  id: number;
  nome: string;
  email: string;
  tipo: 'admin' | 'funcionario';
}

export const metadata: Metadata = {
  title: "Bar Doce Lar | Management System",
  description: "Sistema premium de gestão para o Bar Doce Lar",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  let user: User | null = null;

  if (userCookie) {
    try {
      user = JSON.parse(userCookie.value);
    } catch {}
  }

  return (
    <html lang="pt" suppressHydrationWarning>
      <head>
        {/* Aplica o tema antes do render para evitar flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var t = localStorage.getItem('theme') || 'dark';
            document.documentElement.setAttribute('data-theme', t);
          })();
        `}} />
      </head>
      <body>
        <ClientLayout user={user}>{children}</ClientLayout>
      </body>
    </html>
  );
}
