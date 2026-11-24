import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteHeader } from '@/modules/accommodations/ui/site-header';
import { UnitCatalog } from '@/modules/accommodations/ui/unit-catalog';

export const metadata: Metadata = {
  title: 'Alojamientos',
  description:
    'Conocé las cabañas, monoambientes y habitación de Bahía Corral, en el Dique Cabra Corral, Salta.',
};
export default function AccommodationsPage() {
  return (
    <>
      <SiteHeader />
      <main className="public-container pb-24 pt-16">
        <Link href="/" className="text-sm text-brand underline">
          Volver al inicio
        </Link>
        <p className="mt-10 text-xs font-semibold uppercase tracking-widest text-brand">
          Tu estadía
        </p>
        <h1 className="editorial mt-2 text-5xl">Alojamientos</h1>
        <p className="my-9 max-w-2xl text-muted">
          Elegí el alojamiento ideal para tu viaje. Podés consultar disponibilidad y reservar
          directamente desde nuestro sitio.
        </p>
        <UnitCatalog />
      </main>
    </>
  );
}
