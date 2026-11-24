import {sql} from 'drizzle-orm';
import {resultRows,runTenantTx} from '@/infrastructure/db/tenant-transaction';
import {PageHeading} from '@/modules/admin/ui/page-heading';
import {requireAdminActor} from '@/modules/identity-access/application/admin-actor';
import {requirePermission} from '@/modules/identity-access/domain/permissions';
import {ManualPaymentForm} from '@/modules/admin/ui/manual-payment-form';
export default async function PaymentsPage(){const actor=await requireAdminActor();requirePermission(actor.role,'payments:read');
 const rows=await runTenantTx({tenantId:actor.tenantId,actorId:actor.userId,actorType:'USER'},async tx=>resultRows<{id:string;amount_cents:string;method:string;channel:string;reference:string}>(await tx.execute(sql`
 SELECT p.id,p.amount_cents::text,p.method,p.channel,r.reference FROM payments p JOIN reservations r ON r.tenant_id=p.tenant_id AND r.id=p.reservation_id
 WHERE p.tenant_id=${actor.tenantId} ORDER BY p.verified_at DESC LIMIT 200`)));
 return <><PageHeading title="Gestión de pagos" subtitle="Ingresos verificados y pagos manuales asociados a reservas"/><div className="mb-8"><ManualPaymentForm/></div><div className="surface-card overflow-x-auto"><table className="w-full min-w-[500px] text-left text-sm"><thead className="bg-[#f2f0e9]"><tr>{['Reserva','Medio','Origen','Importe'].map(t=><th key={t} className="p-4">{t}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id} className="border-t border-[#e9e6de]"><td className="p-4">{r.reference}</td><td className="p-4">{r.method}</td><td className="p-4">{r.channel}</td><td className="p-4 font-semibold">$ {(BigInt(r.amount_cents)/100n).toLocaleString('es-AR')}</td></tr>)}</tbody></table></div></>;
}
