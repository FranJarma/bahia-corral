import { ArrowRight, Mail, MapPin, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { UnitCatalog } from '@/modules/accommodations/ui/unit-catalog';
import { EventInquiryForm } from '@/modules/events/ui/event-inquiry-form';
import { AvailabilitySearch } from '@/modules/reservations/ui/availability-search';
import { PublicPage } from '@/modules/shared-ui/public-page';

export const metadata: Metadata = { title: 'Naturaleza y descanso frente al Dique Cabra Corral' };

const experiences = [
  { title: 'Náutica', image: '/images/nautica.jpg', description: 'Catamarán para paseo o pesca, experiencias en lancha y kayak.' },
  { title: 'Aire libre junto al dique', image: '/images/aire-libre.jpg', description: 'Espacios verdes recreativos y acceso a la costa para disfrutar del entorno.' },
  { title: 'SPA', image: '/images/spa.jpg', description: 'Masoterapia, aromaterapia, gimnasio y espacios de bienestar.' },
  { title: 'Restaurante y Cava', image: '/images/restaurante-cava.jpg', description: 'Restaurante para 150 comensales y cava subterránea para hasta 15 personas.' },
] as const;

export default function HomePage() {
  return (
    <PublicPage>
      <section className="relative isolate bg-cream md:min-h-[826px]">
        <div className="absolute inset-x-0 top-0 hidden h-[702px] md:block">
          <Image src="/images/hero-figma.jpg" alt="" fill priority sizes="100vw" className="object-cover object-center" />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-cream/85 via-cream/30 to-transparent" />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-cream to-transparent" />
        </div>
        <div className="public-container relative pt-6 pb-12 text-center md:pt-16 md:text-left">
          <div className="hidden md:block"><Image src="/images/logo-bahia-corral.png" alt="Bahía Corral, Club Náutico, Cabañas & Spa" width={139} height={119} priority className="h-auto w-[139px]" /></div>
          <p className="public-kicker mt-3 md:mt-6">Experiencias únicas en el Dique Cabra Corral</p>
          <h1 className="editorial mx-auto mt-4 max-w-[740px] text-[36px] leading-[1.08] md:mx-0 md:mt-6 md:text-[clamp(48px,5.2vw,78px)]">Naturaleza y descanso frente al Dique Cabra Corral</h1>
          <div className="relative mx-auto mt-6 aspect-[1.7] w-full overflow-hidden rounded-[16px] md:hidden"><Image src="/images/hero-figma.jpg" alt="Vista panorámica del Dique Cabra Corral" fill priority sizes="(max-width: 640px) 100vw, 390px" className="object-cover object-right" /></div>
          <p className="mx-auto mt-5 max-w-[670px] text-[13px] leading-[1.7] text-muted md:mx-0 md:mt-6 md:text-[19px]">Frente al dique, rodeadas de naturaleza. Descansá, disfrutá y viví momentos inolvidables en uno de los paisajes más increíbles de Salta.</p>
          <div className="mx-auto mt-7 text-left md:mx-0 md:mt-7"><AvailabilitySearch /></div>
        </div>
      </section>

      <section className="public-container py-12 md:pt-20 md:pb-24" id="alojamientos">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5 md:mb-10">
          <div><p className="public-kicker">Nuestros alojamientos</p><h2 className="editorial section-heading mt-3">Elegí tu refugio ideal</h2><p className="mt-3 max-w-[600px] text-xs leading-6 text-muted">Descubrí nuestras cabañas, monoambientes y habitación frente al dique.</p></div>
          <Link href="/alojamientos" className="hidden text-xs font-semibold hover:underline md:flex md:gap-2">Ver todos los alojamientos <ArrowRight size={15}/></Link>
        </div>
        <UnitCatalog mobileCarousel />
        <Link href="/alojamientos" className="secondary-button mt-7 w-full md:hidden">Ver todos los alojamientos <ArrowRight size={15}/></Link>
      </section>

      <section className="bg-sand py-16 md:py-24" id="experiencias">
        <div className="public-container">
          <p className="public-kicker">Experiencias en Cabra Corral</p>
          <h2 className="editorial section-heading mt-3">Naturaleza, agua y descanso</h2>
          <p className="mt-3 max-w-[700px] text-xs leading-6 text-muted">Un entorno pensado para reconectar. Cada estadía combina el paisaje del dique con actividades y momentos de calma.</p>
          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {experiences.map((experience, index) => (
              <article key={experience.title} className={`${index !== 1 ? 'hidden sm:block' : ''} overflow-hidden rounded-[16px] bg-cream-soft text-center`}>
                <div className="relative aspect-[4/3] overflow-hidden"><Image src={experience.image} alt={experience.title} fill sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,300px" className="object-cover" /></div>
                <div className="px-5 py-7"><h3 className="editorial text-[24px]">{experience.title}</h3><p className="mt-2 text-xs leading-6 text-muted">{experience.description}</p></div>
              </article>
            ))}
          </div>
          <Link href="/experiencias" className="secondary-button mt-7 w-full sm:hidden">Explorar experiencias <ArrowRight size={15}/></Link>
        </div>
      </section>

      <section className="public-container py-16 md:py-24" id="eventos">
        <div className="mx-auto max-w-[1040px] md:block">
          <div className="hidden md:block"><EventInquiryForm /></div>
          <div className="md:hidden">
            <h2 className="editorial section-heading text-center">Celebraciones frente al agua</h2>
            <div className="relative mt-6 aspect-[4/3] overflow-hidden rounded-2xl"><Image src="/images/eventos-figma.jpg" alt="Celebración privada frente al dique" fill sizes="100vw" className="object-cover"/></div>
            <p className="mt-5 text-center text-xs leading-6 text-muted">Eventos privados y corporativos, con posibilidad de alojamiento para tus invitados.</p>
            <Link href="/eventos" className="secondary-button mt-6 w-full">Explorar experiencias <ArrowRight size={15}/></Link>
          </div>
        </div>
      </section>

      <section className="bg-sand py-16 md:py-20" id="ubicacion">
        <div className="public-container grid items-center gap-10 md:grid-cols-[.8fr_1.2fr] md:gap-16">
          <div>
            <p className="public-kicker">Ubicación</p>
            <h2 className="editorial section-heading mt-4">Dique Cabra Corral, Salta</h2>
            <p className="mt-4 max-w-[450px] text-xs leading-6 text-muted">Bahía Corral se encuentra a orillas del Dique Cabra Corral, uno de los espejos de agua más imponentes del norte argentino. Un entorno de sierras, vegetación nativa y atardeceres únicos.</p>
            <address className="mt-7 not-italic text-xs leading-6 text-muted">
              <p className="flex items-start gap-3"><MapPin size={16} className="shrink-0"/>Ruta 47 Km 4,5 Coronel Moldes, Dique Cabra Corral, 4421, Salta</p>
              <p className="mt-3 flex items-center gap-3"><Phone size={16}/><a href="tel:+543875330834" className="underline underline-offset-4">387 533-0834</a></p>
              <p className="mt-3 flex items-center gap-3"><Mail size={16}/><a href="mailto:reservas@bahiacorral.com">reservas@bahiacorral.com</a></p>
            </address>
          </div>
          <div className="overflow-hidden rounded-2xl bg-[#d9e9dc] shadow-sm"><iframe title="Ubicación de Bahía Corral en Google Maps" src="https://www.google.com/maps?q=Bahia%20Corral%20Dique%20Cabra%20Corral%20Salta&output=embed" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen className="h-[280px] w-full border-0 md:h-[340px]" /></div>
        </div>
        <div className="public-container mt-5 text-center md:hidden"><a className="secondary-button w-full" href="https://www.google.com/maps/search/?api=1&query=Bahia+Corral+Dique+Cabra+Corral" target="_blank" rel="noreferrer">Cómo llegar <ArrowRight size={15}/></a></div>
      </section>

      <section className="public-container hidden py-24 md:block">
        <div className="relative isolate flex min-h-[360px] flex-col items-center justify-center overflow-hidden rounded-2xl px-6 text-center text-white">
          <Image src="/images/cta-naturaleza.jpg" alt="Paisaje natural frente al Dique Cabra Corral" fill sizes="100vw" className="-z-20 object-cover" />
          <div className="absolute inset-0 -z-10 bg-[#173747]/45" />
          <p className="public-kicker !text-white/80">Tu próxima escapada</p>
          <h2 className="editorial mt-4 max-w-[550px] text-5xl">Reservá tu estadía frente al dique</h2>
          <p className="mt-4 max-w-lg text-xs leading-6 text-white/90">Descubrí nuestras cabañas, monoambientes y habitación. Viví el Dique Cabra Corral.</p>
          <Link href="/reservar" className="secondary-button mt-7">Reservar ahora <ArrowRight size={15}/></Link>
        </div>
      </section>
    </PublicPage>
  );
}
