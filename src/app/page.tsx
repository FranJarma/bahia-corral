import Image from 'next/image';
import Link from 'next/link';

import { SiteHeader } from '@/modules/accommodations/ui/site-header';
import { UnitCatalog } from '@/modules/accommodations/ui/unit-catalog';

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative isolate min-h-[620px] overflow-hidden bg-cream pt-28 pb-24 md:min-h-[740px] md:pt-44">
          <Image
            src="/images/hero-figma.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-20 object-cover object-center"
          />
          <div
            className="absolute inset-0 -z-10 bg-gradient-to-r from-cream/95 from-[15%] via-cream/45 via-[55%] to-transparent"
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-cream to-transparent"
            aria-hidden="true"
          />
          <div className="public-container relative z-10">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[.22em] text-brand">
              Experiencias únicas en el Dique Cabra Corral
            </p>
            <h1 className="editorial max-w-[680px] text-5xl leading-tight md:text-7xl">
              Un refugio de lujo en Salta
            </h1>
            <p className="mt-5 max-w-[520px] text-lg leading-relaxed text-[#44585c]">
              Naturaleza, descanso y momentos para recordar. Viví Bahía Corral a orillas del dique.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link className="primary-button" href="/alojamientos">
                Ver alojamientos
              </Link>
              <Link className="secondary-button" href="/#servicios">
                Conocer el complejo
              </Link>
            </div>
          </div>
        </section>
        <section className="public-container py-20" id="alojamientos">
          <div className="mb-9">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand">
              Nuestros alojamientos
            </p>
            <h2 className="editorial section-heading">Elegí tu refugio ideal</h2>
            <p className="mt-3 max-w-[600px] text-muted">
              Cada alojamiento está pensado para disfrutar en familia, en pareja o con amigos.
            </p>
          </div>
          <UnitCatalog />
        </section>
        <section id="servicios" className="bg-[#eae9e0] py-20">
          <div className="public-container">
            <h2 className="editorial section-heading">Experiencias para recordar</h2>
            <p className="mt-4 max-w-xl text-muted">
              Descubrí nuestra gastronomía, el spa y la cava de vinos. Consultá disponibilidad de
              estos servicios con el complejo.
            </p>
            <Link href="/eventos" className="secondary-button mt-7">
              Consultá por tu evento
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-[#dedad1] py-8">
        <div className="public-container flex flex-wrap justify-between gap-3 text-sm text-muted">
          <span>© Bahía Corral · Dique Cabra Corral, Salta</span>
          <span>Naturaleza, descanso y momentos para recordar.</span>
        </div>
      </footer>
    </>
  );
}
