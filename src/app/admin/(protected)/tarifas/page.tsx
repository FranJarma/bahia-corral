import {sql} from 'drizzle-orm';
import {resultRows,runTenantTx} from '@/infrastructure/db/tenant-transaction';
import {PageHeading} from '@/modules/admin/ui/page-heading';
import {requireAdminActor} from '@/modules/identity-access/application/admin-actor';
import {requirePermission} from '@/modules/identity-access/domain/permissions';
export default async function RatesPage(){const actor=await requireAdminActor();requirePermission(actor.role,'pricing:write');
  const rates=await runTenantTx({tenantId:actor.tenantId,actorId:actor.userId,actorType:'USER'},async tx=>resultRows<{name:string;min_guests:number;max_guests:number;amount_cents:string}>(await tx.execute(sql`
    SELECT u.name,b.min_guests,b.max_guests,b.amount_cents::text FROM base_rates b JOIN accommodation_units u ON u.tenant_id=b.tenant_id AND u.id=b.unit_id
    WHERE b.tenant_id=${actor.tenantId} ORDER BY u.code,b.min_guests`)));
  return <><PageHeading title="Gestión de tarifas" subtitle="Tarifa base obligatoria para cada tramo y alojamiento"/><div className="surface-card overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-[#f2f0e9]"><tr>{['Alojamiento','Personas que pagan','Precio por noche'].map(t=><th key={t} className="px-5 py-4">{t}</th>)}</tr></thead><tbody>{rates.map((r,i)=><tr key={i} className="border-t border-[#e9e6de]"><td className="px-5 py-4">{r.name}</td><td className="px-5 py-4">{r.min_guests}–{r.max_guests}</td><td className="px-5 py-4">$ {(BigInt(r.amount_cents)/100n).toLocaleString('es-AR')}</td></tr>)}</tbody></table></div></>;
}
