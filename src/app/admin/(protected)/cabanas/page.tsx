import Link from 'next/link';
import {sql} from 'drizzle-orm';
import {resultRows,runTenantTx} from '@/infrastructure/db/tenant-transaction';
import {PageHeading} from '@/modules/admin/ui/page-heading';
import {requireAdminActor} from '@/modules/identity-access/application/admin-actor';
import {requirePermission} from '@/modules/identity-access/domain/permissions';
export default async function AdminUnitsPage(){const actor=await requireAdminActor();requirePermission(actor.role,'reservations:read');
  const units=await runTenantTx({tenantId:actor.tenantId,actorId:actor.userId,actorType:'USER'},async tx=>resultRows<{id:string;name:string;type:string;capacity_total:number;published:boolean}>(await tx.execute(sql`SELECT id,name,type,capacity_total,published FROM accommodation_units WHERE tenant_id=${actor.tenantId} ORDER BY code`)));
  return <><PageHeading title="Gestión de alojamientos" subtitle="Seis unidades físicas · capacidades y disponibilidad"/><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{units.map(u=><article className="surface-card p-6" key={u.id}><p className="mb-2 text-xs uppercase tracking-widest text-muted">{u.type}</p><h2 className="editorial text-2xl">{u.name}</h2><p className="my-4 text-sm text-muted">Capacidad máxima: {u.capacity_total} huéspedes, incluidos menores.</p><p className="text-sm">{u.published?'Publicada':'No publicada'}</p><Link href="/admin/tarifas" className="mt-5 inline-block text-sm font-semibold text-brand underline">Consultar tarifas</Link></article>)}</div></>;
}
