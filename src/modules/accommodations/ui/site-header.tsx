'use client';

import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const navigation = [
  { href: '/', label: 'Inicio' },
  { href: '/alojamientos', label: 'Alojamientos' },
  { href: '/experiencias', label: 'Experiencias' },
  { href: '/eventos', label: 'Eventos' },
  { href: '/nosotros', label: 'Nosotros' },
  { href: '/contacto', label: 'Contacto' },
] as const;

export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    firstLink.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); opener.current?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKeyDown); };
  }, [open]);

  return (
    <>
      <header className="relative z-40 border-b border-[#eee8de] bg-cream" aria-label="Encabezado del sitio">
        <nav className="public-container hidden min-h-[48px] items-center justify-between gap-8 md:flex" aria-label="Navegación principal">
          <div className="flex items-center gap-8">
            {navigation.map((item) => (
              <Link href={item.href} key={item.href} aria-current={item.href === path ? 'page' : undefined} className={`text-[10px] font-semibold uppercase tracking-[.12em] transition-colors hover:text-ink ${item.href === path ? 'text-ink' : 'text-[#68767a]'}`}>{item.label}</Link>
            ))}
          </div>
          <Link href="/mis-reservas" className="text-[11px] font-semibold hover:underline hover:underline-offset-4">Mis reservas</Link>
        </nav>
        <nav className="public-container flex h-[80px] items-center justify-between md:hidden" aria-label="Navegación móvil">
          <Link href="/" aria-label="Bahía Corral, ir a inicio" className="shrink-0"><Image src="/images/logo-bahia-corral.png" alt="Bahía Corral" width={76} height={64} className="h-[64px] w-auto object-contain" priority /></Link>
          <button ref={opener} type="button" className="flex h-11 w-11 items-center justify-center text-ink" aria-label="Abrir menú" aria-expanded={open} aria-controls="public-mobile-menu" onClick={() => setOpen(true)}><Menu size={27}/></button>
        </nav>
      </header>
      {open && (
        <div id="public-mobile-menu" role="dialog" aria-modal="true" aria-label="Menú de navegación" className="fixed inset-0 z-[70] overflow-y-auto bg-cream px-6 pb-[max(24px,env(safe-area-inset-bottom))]">
          <div className="flex h-[80px] items-center justify-between">
            <Link href="/" aria-label="Inicio" onClick={() => setOpen(false)}><Image src="/images/logo-bahia-corral.png" alt="Bahía Corral" width={76} height={64} className="h-[64px] w-auto object-contain"/></Link>
            <button type="button" aria-label="Cerrar menú" className="flex h-11 w-11 items-center justify-center" onClick={() => { setOpen(false); opener.current?.focus(); }}><X size={26}/></button>
          </div>
          <nav aria-label="Secciones" className="mt-10 flex flex-col gap-1">
            {navigation.map((item, index) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} ref={index === 0 ? firstLink : undefined} className={`border-b border-[#dfd4c5] px-1 py-5 text-lg font-medium ${item.href === path ? 'text-ink' : 'text-muted'}`}>{item.label}</Link>
            ))}
            <Link href="/mis-reservas" onClick={() => setOpen(false)} className="mt-8 primary-button w-full">Mis reservas</Link>
            <Link href="/reservar" onClick={() => setOpen(false)} className="secondary-button mt-3 w-full">Reservar ahora</Link>
          </nav>
          <div className="mt-14 text-center text-xs leading-6 text-muted"><Image src="/images/logo-bahia-corral.png" alt="" width={140} height={118} className="mx-auto mb-3 h-auto w-[140px]"/>Naturaleza y descanso frente al dique.</div>
        </div>
      )}
    </>
  );
}
