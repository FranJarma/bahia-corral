import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { PUBLIC_UNITS } from '@/modules/accommodations/domain/seed-units';
import { AccommodationList } from '@/modules/accommodations/ui/accommodation-list';
import { AvailabilitySearch } from '@/modules/reservations/ui/availability-search';
import { PublicPage } from '@/modules/shared-ui/public-page';

export const metadata: Metadata = {
  title: 'Nuestros alojamientos',
  description:
    'Descubrí las cabañas, monoambientes y habitación de Bahía Corral, frente al Dique Cabra Corral, Salta.',
};

const amenities = [
  {
    title: 'Cocina y equipamiento',
    description: 'Espacios equipados para una estadía cómoda y práctica.',
  },
  {
    title: 'Confort en tu cabaña',
    description: 'Ambientes pensados para descansar junto a la naturaleza.',
  },
  {
    title: 'Espacios del predio',
    description: 'Aire libre y actividades para disfrutar el Dique Cabra Corral.',
  },
];
const gallery = [
  '/images/galeria-cabana-1-2.jpg',
  '/images/galeria-cabana-1-3.jpg',
  '/images/galeria-cabana-1-4.jpg',
];

export default function AccommodationsPage() {
  return (
    <PublicPage>
      <section className="public-container pt-10 pb-20 md:pt-16">
        <nav className="public-breadcrumb" aria-label="Migas de pan">
          <Link href="/">Inicio</Link>
          <span>/</span>
          <span aria-current="page">Alojamientos</span>
        </nav>
        <h1 className="editorial mt-6 text-[42px] leading-tight md:mt-8 md:text-[56px]">
          Nuestros alojamientos
        </h1>
        <p className="mt-3 max-w-2xl text-xs leading-6 text-muted">
          Elegí tu alojamiento y disfrutá una estadía rodeada de naturaleza en Cabra Corral, Salta.
        </p>
        <div className="my-8">
          <AvailabilitySearch />
        </div>
        <AccommodationList />
      </section>
      <section className="bg-sand py-16 md:py-20">
        <div className="public-container">
          <h2 className="editorial section-heading text-center">Todo para tu estadía</h2>
          <p className="mt-2 text-center text-xs text-muted">
            Confort, descanso, naturaleza y comodidad.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {amenities.map((item, i) => (
              <article key={item.title}>
                <div className="relative aspect-[1.3] overflow-hidden rounded-xl">
                  <Image
                    src={gallery[i]}
                    fill
                    sizes="(max-width:768px) 100vw, 33vw"
                    alt={item.title}
                    className="object-cover"
                  />
                </div>
                <h3 className="editorial mt-5 text-[23px]">{item.title}</h3>
                <p className="mt-2 text-xs leading-6 text-muted">{item.description}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/reservar" className="primary-button">
              Reservar ahora <ArrowRight size={15} />
            </Link>
            <Link href="/contacto" className="secondary-button">
              Consultar por una estadía
            </Link>
          </div>
          <p className="sr-only">{PUBLIC_UNITS.length} unidades físicas de alojamiento.</p>
        </div>
      </section>
    </PublicPage>
  );
}
