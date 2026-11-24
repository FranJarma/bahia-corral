import '@/styles/globals.css';

import type { Metadata } from 'next';
import { Montserrat, Playfair_Display } from 'next/font/google';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Bahía Corral — Naturaleza y descanso en el Dique Cabra Corral',
    template: '%s | Bahía Corral',
  },
  description:
    'Alojamientos, naturaleza y experiencias en Bahía Corral, frente al Dique Cabra Corral, Salta. Conocé nuestras cabañas y reservá tu estadía.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://bahiacorral.com'),
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" className={`${montserrat.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  );
}
