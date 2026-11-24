import { sql } from 'drizzle-orm';

import { resultRows, runTenantTx, type TenantContext } from '@/infrastructure/db/tenant-transaction';

export type ReservationSummary={
  id:string;reference:string;guest_name:string;guest_phone:string;checkin:string;checkout:string;
  unit_name:string;status:string;amount_cents:string;paid_cents:string;
};
export async function listReservations(ctx:TenantContext):Promise<ReservationSummary[]>{
  return runTenantTx(ctx,async tx=>resultRows<ReservationSummary>(await tx.execute(sql`
    SELECT r.id,r.reference,(g.first_name||' '||g.last_name) as guest_name,g.phone as guest_phone,
    r.checkin::text,r.checkout::text,u.name as unit_name,r.status,q.amount_cents::text,
    COALESCE((SELECT SUM(p.amount_cents) FROM payments p WHERE p.tenant_id=r.tenant_id AND p.reservation_id=r.id),0)::text as paid_cents
    FROM reservations r JOIN guests g ON g.tenant_id=r.tenant_id AND g.id=r.guest_id
    JOIN accommodation_units u ON u.tenant_id=r.tenant_id AND u.id=r.unit_id
    JOIN stay_quotes q ON q.tenant_id=r.tenant_id AND q.id=r.quote_id
    WHERE r.tenant_id=${ctx.tenantId} ORDER BY r.created_at DESC LIMIT 250
  `)));
}
