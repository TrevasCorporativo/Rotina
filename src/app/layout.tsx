import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Modo Sobrevivência — Gestão da vida adulta',
  description:
    'Organize tarefas, compromissos e sua rotina pessoal com privacidade e notificações.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sobrevivência',
  },
};

export const viewport: Viewport = {
  themeColor: '#268675',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 3,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
