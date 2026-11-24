import {sql} from 'drizzle-orm';
import {resultRows,runTenantTx} from '@/infrastructure/db/tenant-transaction';
import {PageHeading} from '@/modules/admin/ui/page-heading';
import {requireAdminActor} from '@/modules/identity-access/application/admin-actor';
import {requirePermission} from '@/modules/identity-access/domain/permissions';
export default async function GuestsPage(){const actor=await requireAdminActor();requirePermission(actor.role,'reservations:read');
  const guests=await runTenantTx({tenantId:actor.tenantId,actorId:actor.userId,actorType:'USER'},async tx=>resultRows<{id:string;first_name:string;last_name:string;email:string|null;phone:string}>(await tx.execute(sql`
    SELECT id,first_name,last_name,email,phone FROM guests WHERE tenant_id=${actor.tenantId} ORDER BY created_at DESC LIMIT 200`)));
  return <><PageHeading title="Gestión de huéspedes" subtitle="Contactos registrados en las reservas del complejo"/><div className="surface-card overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-[#f2f0e9]"><tr>{['Huésped','Correo','Teléfono'].map(t=><th key={t} className="p-5">{t}</th>)}</tr></thead><tbody>{guests.map(g=><tr className="border-t border-[#e9e6de]" key={g.id}><td className="p-5">{g.first_name} {g.last_name}</td><td className="p-5">{g.email??'No informado'}</td><td className="p-5">{g.phone}</td></tr>)}</tbody></table>{!guests.length&&<p className="p-7 text-center text-muted">No hay huéspedes todavía.</p>}</div></>;
}
