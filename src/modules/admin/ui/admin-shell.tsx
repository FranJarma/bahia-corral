import {
  BedDouble,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Home,
  Settings,
  Sparkles,
  Users,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';

import { LogoutButton } from '@/modules/admin/ui/logout-button';
import type { AdminActor } from '@/modules/identity-access/application/admin-actor';

const navigation = [
  { href: '/admin', title: 'Inicio', icon: Home, permission: 'all' },
  { href: '/admin/reservas', title: 'Reservas', icon: ClipboardList, permission: 'general' },
  { href: '/admin/calendario', title: 'Calendario', icon: CalendarDays, permission: 'general' },
  { href: '/admin/cabanas', title: 'Alojamientos', icon: BedDouble, permission: 'general' },
  { href: '/admin/huespedes', title: 'Huéspedes', icon: Users, permission: 'general' },
  { href: '/admin/pagos', title: 'Pagos', icon: CreditCard, permission: 'general' },
  { href: '/admin/eventos', title: 'Eventos', icon: Sparkles, permission: 'general' },
  { href: '/admin/limpieza', title: 'Limpieza', icon: Wrench, permission: 'all' },
  { href: '/admin/recepcion', title: 'Recepción', icon: UtensilsCrossed, permission: 'general' },
  { href: '/admin/tarifas', title: 'Tarifas', icon: Settings, permission: 'owner' },
  { href: '/admin/configuracion', title: 'Configuración', icon: Settings, permission: 'owner' },
] as const;

export function AdminShell({ children, actor }: { children: React.ReactNode; actor: AdminActor }) {
  const links = navigation.filter(
    (n) =>
      n.permission === 'all' ||
      (n.permission === 'general' && actor.role !== 'CLEANING') ||
      (n.permission === 'owner' && ['OWNER', 'PLATFORM_ADMIN'].includes(actor.role)),
  );
  return (
    <div className="min-h-screen bg-[#f7f5ef] text-ink md:grid md:grid-cols-[250px_minmax(0,1fr)]">
      <aside
        className="border-r border-[#e5e5de] bg-[#fffdf9] p-5 md:min-h-screen"
        aria-label="Navegación administrativa"
      >
        <Link href="/admin" className="editorial mb-7 block text-2xl font-bold">
          Bahía Corral
          <span className="ml-1 align-top text-xs font-sans font-medium text-brand">ADMIN</span>
        </Link>
        <nav
          className="flex gap-1 overflow-x-auto pb-2 md:flex-col md:gap-1.5"
          aria-label="Secciones del dashboard"
        >
          {links.map((item) => (
            <Link
              href={item.href}
              key={item.href}
              className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-[#475b61] transition-colors hover:bg-[#edf1ec] hover:text-ink"
            >
              <item.icon size={18} aria-hidden="true" />
              {item.title}
            </Link>
          ))}
        </nav>
        <div className="mt-9 border-t border-[#e8e6df] pt-5">
          <p className="max-w-full truncate text-sm font-semibold">{actor.email}</p>
          <p className="mb-3 text-xs text-muted">{actor.role}</p>
          <LogoutButton />
        </div>
      </aside>
      <div className="min-w-0">
        <header className="border-b border-[#e5e5de] bg-[#fffdf9] px-5 py-4 md:px-10">
          <p className="text-sm text-muted">Gestión del complejo</p>
          <p className="text-sm font-semibold">Bahía Corral · Dique Cabra Corral</p>
        </header>
        <main className="mx-auto max-w-[1500px] px-5 py-8 md:px-10 md:py-10">{children}</main>
      </div>
    </div>
  );
}
