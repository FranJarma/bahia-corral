import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { ContactForm } from '@/modules/shared-ui/contact-form';
import { PublicPage } from '@/modules/shared-ui/public-page';

export const metadata: Metadata = {
  title: 'Contacto',
  description:
    'Comunicate con Bahía Corral para planificar tu visita al Dique Cabra Corral, Salta.',
};
export default function ContactPage() {
  return (
    <PublicPage>
      <section className="public-container py-16 md:py-20">
        <header className="mb-12 text-center">
          <h1 className="editorial text-[38px] md:text-[50px]">Hablemos de tu próxima escapada</h1>
          <p className="mt-3 text-sm text-muted">
            Estamos para ayudarte a preparar tu estadía en Bahía Corral.
          </p>
        </header>
        <div className="grid gap-12 md:grid-cols-[.85fr_1.15fr] md:gap-16">
          <div className="text-xs text-muted">
            <p className="leading-7">
              Teléfono:{' '}
              <a href="tel:+543875330834" className="hover:underline">
                387 533-0834
              </a>
              <br />
              Email:{' '}
              <a href="mailto:reservas@bahiacorral.com" className="hover:underline">
                reservas@bahiacorral.com
              </a>
              <br />
              Ruta 47 Km 4,5 · Coronel Moldes · Dique Cabra Corral · 4421 · Salta
            </p>
            <a href="tel:+543875330834" className="secondary-button mt-8">
              Llamar a Bahía Corral
            </a>
            <p className="mt-8">
              <a
                href="mailto:reservas@bahiacorral.com"
                className="font-semibold uppercase tracking-wider hover:underline"
              >
                Escribir un email
              </a>
            </p>
            <div className="mt-10 rounded-xl bg-white p-6">
              <h2 className="editorial text-[25px]">Dique Cabra Corral · Salta</h2>
              <p className="mt-3 text-xs">Ruta 47 Km 4,5, Coronel Moldes</p>
              <a
                className="mt-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase"
                href="https://www.google.com/maps/search/?api=1&query=Bahia+Corral+Dique+Cabra+Corral"
                target="_blank"
                rel="noreferrer"
              >
                Abrir ubicación en Google Maps <ArrowRight size={13} />
              </a>
            </div>
            <p className="mt-7 text-[11px] text-muted">
              WhatsApp: <a href="https://wa.me/5493875330834">387 533-0834</a>
            </p>
            <Link
              href="/alojamientos"
              className="mt-7 inline-flex items-center gap-2 text-xs font-semibold text-ink hover:underline"
            >
              Ver alojamientos <ArrowRight size={14} />
            </Link>
          </div>
          <ContactForm />
        </div>
      </section>
    </PublicPage>
  );
}
