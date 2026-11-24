import Link from 'next/link';
import {PageHeading} from '@/modules/admin/ui/page-heading';
import {requireAdminActor} from '@/modules/identity-access/application/admin-actor';
import {requirePermission} from '@/modules/identity-access/domain/permissions';
import {listReservations} from '@/modules/reservations/application/list-reservations';
export const dynamic='force-dynamic';
export default async function AdminReservationsPage(){
  const actor=await requireAdminActor();requirePermission(actor.role,'reservations:read');
  const rows=await listReservations({tenantId:actor.tenantId,actorId:actor.userId,actorType:'USER'});
  return <><PageHeading title="Gestión de reservas" subtitle="Administrá las estadías del complejo" action={<Link href="/admin/reservas/nueva" className="primary-button">Crear reserva</Link>}/>
  <div className="surface-card overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#f2f0e9] text-[#516067]"><tr>{['Referencia','Huésped','Alojamiento','Ingreso','Salida','Estado','Acción'].map(c=><th key={c} scope="col" className="px-5 py-4 font-semibold">{c}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.id} className="border-t border-[#e9e6de]"><td className="px-5 py-4 font-semibold">{row.reference}</td><td className="px-5 py-4">{row.guest_name}</td><td className="px-5 py-4">{row.unit_name}</td><td className="px-5 py-4">{row.checkin}</td><td className="px-5 py-4">{row.checkout}</td><td className="px-5 py-4">{row.status}</td><td className="px-5 py-4"><Link className="font-semibold text-brand underline" href={`/admin/reservas/${row.id}`}>Ver detalle</Link></td></tr>)}</tbody></table>{rows.length===0&&<p className="p-8 text-center text-muted">Todavía no hay reservas registradas.</p>}</div></>;
}
