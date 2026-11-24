import Link from 'next/link';

import { PageHeading } from '@/modules/admin/ui/page-heading';
import { SummaryCard } from '@/modules/admin/ui/summary-card';
import { requireAdminActor } from '@/modules/identity-access/application/admin-actor';
import { listReservations } from '@/modules/reservations/application/list-reservations';
export const dynamic = 'force-dynamic';
export default async function DashboardPage() {
  const actor = await requireAdminActor();
  if (actor.role === 'CLEANING')
    return (
      <div>
        <PageHeading
          title="Tu jornada de limpieza"
          subtitle="Actualizá las unidades asignadas desde el módulo de limpieza"
        />
        <Link className="primary-button" href="/admin/limpieza">
          Ir a limpieza
        </Link>
      </div>
    );
  const reservations = await listReservations({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    actorType: 'USER',
  });
  const confirmed = reservations.filter((r) => r.status === 'CONFIRMED' || r.status === 'IN_STAY');
  const pending = reservations.filter((r) => r.status === 'PENDING_CONFIRMATION');
  return (
    <>
      <PageHeading
        title="Un vistazo a tu día"
        subtitle="Ocupación, reservas y tareas pendientes del complejo"
        action={
          <Link className="primary-button" href="/admin/reservas/nueva">
            Crear reserva
          </Link>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Reservas confirmadas" value={confirmed.length} />
        <SummaryCard title="Pendientes de confirmación" value={pending.length} />
        <SummaryCard
          title="Alojamientos físicos"
          value={6}
          subtitle="Tres cabañas, dos monoambientes y una habitación"
        />
      </div>
      <section className="surface-card mt-7 p-7">
        <h2 className="editorial text-2xl">Próximas estadías</h2>
        <div className="mt-5 grid gap-3">
          {confirmed.slice(0, 6).map((r) => (
            <Link
              href={`/admin/reservas/${r.id}`}
              key={r.id}
              className="flex flex-wrap justify-between gap-2 rounded-lg border border-[#ece6dc] p-4 hover:bg-[#f8f6ef]"
            >
              <span className="font-semibold">{r.guest_name}</span>
              <span className="text-sm text-muted">
                {r.unit_name} · {r.checkin}–{r.checkout}
              </span>
            </Link>
          ))}
          {confirmed.length === 0 && (
            <p className="text-sm text-muted">Todavía no hay reservas confirmadas.</p>
          )}
        </div>
      </section>
    </>
  );
}
