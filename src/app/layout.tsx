import '@/styles/globals.css';

import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-editorial' });

export const metadata: Metadata = {
  title: {
    default: 'Bahía Corral — Naturaleza y descanso en Salta',
    template: '%s | Bahía Corral',
  },
  description:
    'Reservá tu estadía en el Dique Cabra Corral. Cabañas, monoambientes y habitación rodeados de naturaleza en Coronel Moldes, Salta.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://bahiacorral.com'),
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" className={`${inter.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  );
}
