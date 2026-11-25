import { sql } from 'drizzle-orm';

import { resultRows, runTenantTx } from '@/infrastructure/db/tenant-transaction';
import { AdminRecordsTable } from '@/modules/admin/ui/admin-records-table';
import { ManualPaymentForm } from '@/modules/admin/ui/manual-payment-form';
import { PageHeading } from '@/modules/admin/ui/page-heading';
import { requireAdminActor } from '@/modules/identity-access/application/admin-actor';
import { requirePermission } from '@/modules/identity-access/domain/permissions';
import { listReservations } from '@/modules/reservations/application/list-reservations';
export default async function PaymentsPage() {
  const actor = await requireAdminActor();
  requirePermission(actor.role, 'payments:read');
  const rows = await runTenantTx(
    { tenantId: actor.tenantId, actorId: actor.userId, actorType: 'USER' },
    async (tx) =>
      resultRows<{
        id: string;
        amount_cents: string;
        method: string;
        channel: string;
        reference: string;
      }>(
        await tx.execute(
          sql`SELECT p.id,p.amount_cents::text,p.method,p.channel,r.reference FROM payments p JOIN reservations r ON r.tenant_id=p.tenant_id AND r.id=p.reservation_id WHERE p.tenant_id=${actor.tenantId} ORDER BY p.verified_at DESC LIMIT 200`,
        ),
      ),
  );
  const reservations = await listReservations({tenantId:actor.tenantId,actorId:actor.userId,actorType:'USER'});
  const mapped = rows.map((row) => ({
    id: row.id,
    reservation: row.reference,
    method: row.method,
    channel: row.channel,
    amount: new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(Number(BigInt(row.amount_cents)) / 100),
  }));
  return (
    <>
      <PageHeading
        title="Gestión de pagos"
        subtitle="Consultá ingresos registrados y asociá cobros manuales a las reservas."
      />
      <div className="mb-7">
        <ManualPaymentForm reservations={reservations} />
      </div>
      <AdminRecordsTable
        rows={mapped}
        columns={[
          { key: 'reservation', label: 'Reserva', weight: 'bold' },
          { key: 'method', label: 'Medio' },
          { key: 'channel', label: 'Origen' },
          { key: 'amount', label: 'Importe', weight: 'bold' },
        ]}
        emptyMessage="Todavía no hay pagos registrados."
        searchPlaceholder="Buscar reserva o medio de pago"
      />
    </>
  );
}
