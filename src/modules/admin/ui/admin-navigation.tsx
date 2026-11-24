'use client';

import {
  BedDouble,
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  Home,
  Menu,
  Settings,
  Sparkles,
  Users,
  Utensils,
  Wrench,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { LogoutButton } from '@/modules/admin/ui/logout-button';
import type { AdminActor } from '@/modules/identity-access/application/admin-actor';

const links = [
  { href: '/admin', title: 'Inicio', Icon: Home, permission: 'all' },
  { href: '/admin/reservas', title: 'Reservas', Icon: ClipboardList, permission: 'general' },
  { href: '/admin/calendario', title: 'Calendario', Icon: CalendarDays, permission: 'general' },
  { href: '/admin/cabanas', title: 'Alojamientos', Icon: BedDouble, permission: 'general' },
  { href: '/admin/huespedes', title: 'Huéspedes', Icon: Users, permission: 'general' },
  { href: '/admin/eventos', title: 'Eventos', Icon: Sparkles, permission: 'general' },
  { href: '/admin/recepcion', title: 'Recepción', Icon: CalendarDays, permission: 'general' },
  { href: '/admin/limpieza', title: 'Limpieza', Icon: Wrench, permission: 'all' },
  { href: '/admin/pagos', title: 'Pagos', Icon: ClipboardList, permission: 'general' },
  { href: '/admin/tarifas', title: 'Tarifas', Icon: Utensils, permission: 'owner' },
  { href: '/admin/configuracion', title: 'Configuración', Icon: Settings, permission: 'owner' },
] as const;

export function AdminNavigation({ actor }: { actor: AdminActor }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const visible = links.filter(
    ({ permission }) =>
      permission === 'all' ||
      (permission === 'general' && actor.role !== 'CLEANING') ||
      (permission === 'owner' && (actor.role === 'OWNER' || actor.role === 'PLATFORM_ADMIN')),
  );

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', close);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', close);
    };
  }, [open]);

  const navigation = (
    <>
      <Link
        href="/admin"
        className="flex justify-center py-4"
        aria-label="Bahía Corral, panel de inicio"
        onClick={() => setOpen(false)}
      >
        <Image
          src="/images/logo-bahia-corral.png"
          alt="Bahía Corral"
          width={122}
          height={104}
          priority
          className={`h-auto object-contain ${collapsed ? 'w-12' : 'w-[110px]'}`}
        />
      </Link>
      {!collapsed && (
        <p className="border-b border-[#e9e4da] pb-3 text-center text-[10px] font-semibold uppercase tracking-wider text-muted">
          Administración
        </p>
      )}
      <nav aria-label="Secciones del panel" className="mt-4 flex flex-col gap-1">
        {visible.map(({ href, title, Icon }) => {
          const active =
            href === '/admin'
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              title={title}
              aria-current={active ? 'page' : undefined}
              onClick={() => setOpen(false)}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${active ? 'bg-[#f4efe6] text-ink' : 'text-[#385362] hover:bg-[#f4efe6]'} ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
              <span className={collapsed ? 'sr-only' : ''}>{title}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-[#e9e4da] pt-4">
        {!collapsed && (
          <>
            <p className="truncate text-[11px] font-semibold text-ink">{actor.email}</p>
            <p className="mb-3 mt-1 text-[10px] text-muted">Bahía Corral · {actor.role}</p>
          </>
        )}
        <LogoutButton />
        <button
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
          className="mt-4 hidden h-10 w-full items-center justify-center text-ink hover:bg-[#f4efe6] md:flex"
        >
          <ChevronLeft size={17} className={collapsed ? 'rotate-180' : ''} />
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside
        className={`hidden min-h-screen flex-col border-r border-[#e9e4da] bg-[#fdfbf7] px-4 pb-4 md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex ${collapsed ? 'md:w-[80px]' : 'md:w-[224px]'}`}
        aria-label="Navegación administrativa"
      >
        {navigation}
      </aside>
      <div
        className={`hidden shrink-0 md:block ${collapsed ? 'w-[80px]' : 'w-[224px]'}`}
        aria-hidden="true"
      />
      <button
        ref={triggerRef}
        type="button"
        className="fixed bottom-5 left-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-white shadow-lg md:hidden"
        aria-label="Abrir menú del panel"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu size={21} />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Menú del panel"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-cream-soft p-5 md:hidden"
        >
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => {
              setOpen(false);
              triggerRef.current?.focus();
            }}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center"
          >
            <X size={23} />
          </button>
          {navigation}
        </div>
      )}
    </>
  );
}
