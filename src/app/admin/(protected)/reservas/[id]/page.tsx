import Link from 'next/link';
import {notFound} from 'next/navigation';
import {PageHeading} from '@/modules/admin/ui/page-heading';
import {requireAdminActor} from '@/modules/identity-access/application/admin-actor';
import {requirePermission} from '@/modules/identity-access/domain/permissions';
import {listReservations} from '@/modules/reservations/application/list-reservations';
import {ReservationActions} from '@/modules/reservations/ui/reservation-actions';
export const dynamic='force-dynamic';
export default async function ReservationDetail({params}:{params:Promise<{id:string}>}){
  const actor=await requireAdminActor();requirePermission(actor.role,'reservations:read');const {id}=await params;
  const rows=await listReservations({tenantId:actor.tenantId,actorId:actor.userId,actorType:'USER'});
  const row=rows.find(r=>r.id===id);if(!row)notFound();
  return <><Link href="/admin/reservas" className="text-sm text-brand underline">Volver a reservas</Link><div className="mt-6"><PageHeading title={`Reserva ${row.reference}`} subtitle={`${row.guest_name} · ${row.unit_name}`}/></div>
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]"><section className="surface-card grid gap-3 p-7"><h2 className="editorial text-2xl">Información de la estadía</h2><p>Ingreso: <strong>{row.checkin}</strong></p><p>Salida: <strong>{row.checkout}</strong></p><p>Estado: <strong>{row.status}</strong></p><p>Teléfono: {row.guest_phone}</p><p>Total acordado: <strong>{(BigInt(row.amount_cents)/100n).toString()} ARS</strong></p><p>Pagos registrados: <strong>{(BigInt(row.paid_cents)/100n).toString()} ARS</strong></p></section><ReservationActions reservationId={row.id} status={row.status}/></div>
  </>;
}
