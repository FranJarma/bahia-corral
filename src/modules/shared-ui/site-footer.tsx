import Image from 'next/image';
import Link from 'next/link';

const explore = [
  { label: 'Alojamientos', href: '/alojamientos' },
  { label: 'Experiencias', href: '/experiencias' },
  { label: 'Eventos', href: '/eventos' },
  { label: 'Nosotros', href: '/nosotros' },
];
const reservations = [
  { label: 'Reservar ahora', href: '/reservar' },
  { label: 'Mis reservas', href: '/mis-reservas' },
  { label: 'Contacto', href: '/contacto' },
  { label: 'Formas de pago', href: '/formas-de-pago' },
];

export function SiteFooter() {
  return (
    <footer className="bg-[#fcfaf6] text-ink">
      <div className="public-container grid gap-10 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-12 md:py-20">
        <div>
          <Link
            href="/#hero"
            className="inline-block"
            aria-label="Bahía Corral, volver al hero de inicio"
          >
            <Image
              src="/images/logo-bahia-corral.png"
              width={129}
              height={108}
              alt="Bahía Corral, Club Náutico, Cabañas & Spa"
              className="h-auto w-[120px]"
            />
          </Link>
          <p className="mt-5 max-w-[265px] text-xs leading-6 text-muted">
            Naturaleza, descanso y momentos para recordar en el Dique Cabra Corral, Salta.
          </p>
        </div>
        <div>
          <h2 className="mb-6 text-[11px] font-bold tracking-[.18em] uppercase">Explorar</h2>
          <nav aria-label="Explorar" className="flex flex-col gap-5 text-xs text-muted">
            {explore.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-ink hover:underline">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div>
          <h2 className="mb-6 text-[11px] font-bold tracking-[.18em] uppercase">Reservas</h2>
          <nav aria-label="Reservas" className="flex flex-col gap-5 text-xs text-muted">
            {reservations.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-ink hover:underline">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div>
          <h2 className="mb-6 text-[11px] font-bold tracking-[.18em] uppercase">Contacto</h2>
          <div className="flex flex-col gap-5 text-xs text-muted">
            <span>Dique Cabra Corral, Salta</span>
            <a href="mailto:reservas@bahiacorral.com" className="hover:text-ink">
              reservas@bahiacorral.com
            </a>
            <a href="tel:+543875330834" className="hover:text-ink">
              387 533-0834
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-[#e9e0d4]">
        <div className="public-container flex flex-wrap items-center justify-between gap-4 py-5 text-[11px] text-muted">
          <span>© 2026 Bahía Corral · Club Náutico, Cabañas &amp; Spa</span>
          <Link href="/#hero" className="hover:text-ink">
            Volver al inicio ↑
          </Link>
        </div>
        <div className="public-container flex flex-wrap items-center justify-center gap-6 pb-6 text-[11px] font-semibold uppercase tracking-[.06em] md:gap-20">
          <Link href="/terminos-y-condiciones">Términos y condiciones</Link>
          <Link href="/arrepentimiento">Botón de arrepentimiento</Link>
        </div>
      </div>
    </footer>
  );
}
