import 'server-only';

import { createHash } from 'node:crypto';

import { sql } from 'drizzle-orm';

import {
  resultRows,
  runTenantTx,
  type TenantContext,
} from '@/infrastructure/db/tenant-transaction';
import { releaseExpiredHolds } from '@/modules/availability/application/holds';
import type { CheckoutSession } from '@/modules/availability/domain/checkout-session';

/** Sólo recupera datos con el secreto del checkout. Un correo no es una credencial. */
export async function getCheckoutSession(
  ctx: TenantContext,
  token: string | undefined,
): Promise<CheckoutSession | null> {
  if (!token || token.length < 32 || token.length > 128) return null;
  await releaseExpiredHolds(ctx);
  return runTenantTx(ctx, async (tx) => {
    const [row] = resultRows<{
      id: string;
      quote_id: string;
      expires_at: Date;
      status: CheckoutSession['status'];
      unit_id: string;
      slug: string;
      checkin: string;
      checkout: string;
      adults: number;
      child_ages: number[];
      amount_cents: string;
      deposit_cents: string;
      reservation_id: string | null;
      reference: string | null;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      phone: string | null;
    }>(
      await tx.execute(sql`
      SELECT h.id,h.quote_id,h.expires_at,h.status,h.unit_id,u.slug,
        q.checkin::text,q.checkout::text,q.adults,q.child_ages,q.amount_cents::text,q.deposit_cents::text,
        h.reservation_id,r.reference,g.first_name,g.last_name,g.email,g.phone
      FROM reservation_holds h
        JOIN accommodation_units u ON u.tenant_id=h.tenant_id AND u.id=h.unit_id
        JOIN stay_quotes q ON q.tenant_id=h.tenant_id AND q.id=h.quote_id
        LEFT JOIN reservations r ON r.tenant_id=h.tenant_id AND r.id=h.reservation_id
        LEFT JOIN guests g ON g.tenant_id=r.tenant_id AND g.id=r.guest_id
      WHERE h.tenant_id=${ctx.tenantId}
        AND h.checkout_token_hash=${createHash('sha256').update(token).digest('hex')}
        AND (r.id IS NULL OR r.status='PENDING_CONFIRMATION')
        AND (h.status IN ('VERIFYING','UNCERTAIN') OR
          (h.status='ACTIVE' AND (h.expires_at>now() OR EXISTS(
            SELECT 1 FROM payments p WHERE p.tenant_id=h.tenant_id AND p.reservation_id=r.id))))
      LIMIT 1`),
    );
    if (!row) return null;
    return {
      holdId: row.id,
      quoteId: row.quote_id,
      checkoutToken: token,
      expiresAt: new Date(row.expires_at).toISOString(),
      totalCents: row.amount_cents,
      depositCents: row.deposit_cents,
      status: row.status,
      unitId: row.unit_id,
      slug: row.slug,
      checkin: row.checkin,
      checkout: row.checkout,
      adults: row.adults,
      childAges: row.child_ages,
      reservationId: row.reservation_id,
      reference: row.reference,
      contact: row.reservation_id
        ? {
            firstName: row.first_name ?? '',
            lastName: row.last_name ?? '',
            email: row.email ?? '',
            phone: row.phone ?? '',
          }
        : null,
    };
  });
}
