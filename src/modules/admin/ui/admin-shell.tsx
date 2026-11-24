import { AdminNavigation } from '@/modules/admin/ui/admin-navigation';
import type { AdminActor } from '@/modules/identity-access/application/admin-actor';

export function AdminShell({ children, actor }: { children: React.ReactNode; actor: AdminActor }) {
  const date = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
  return <div className="flex min-h-screen bg-cream text-ink">
    <AdminNavigation actor={actor} />
    <div className="min-w-0 flex-1">
      <header className="flex min-h-[64px] items-center justify-between border-b border-[#eee8de] bg-cream-soft px-6 md:px-8">
        <span className="pl-12 text-xs font-semibold md:pl-0">Guía de uso</span>
        <span className="hidden text-[10px] capitalize text-muted sm:block">{date}</span>
      </header>
      <main className="mx-auto w-full max-w-[1610px] px-5 py-7 md:px-8 md:py-9">{children}</main>
    </div>
  </div>;
}
