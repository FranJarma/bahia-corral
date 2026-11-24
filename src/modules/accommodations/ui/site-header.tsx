import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="border-b border-[#e1ddd4] bg-cream-soft/95">
      <nav className="public-container flex min-h-20 items-center justify-between gap-6" aria-label="Principal">
        <Link href="/" className="editorial text-2xl font-semibold tracking-tight text-ink">Bahía Corral</Link>
        <div className="hidden items-center gap-8 text-sm font-medium md:flex"><Link href="/alojamientos">Alojamientos</Link><Link href="/#servicios">Servicios</Link><Link href="/eventos">Eventos</Link><Link href="/mis-reservas">Mis reservas</Link></div>
        <Link href="/alojamientos" className="primary-button text-sm">Reservar ahora</Link>
      </nav>
    </header>
  );
}
