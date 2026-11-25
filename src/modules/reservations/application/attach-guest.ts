import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';

import {
  resultRows,
  runTenantTx,
  type TenantContext,
} from '@/infrastructure/db/tenant-transaction';
import { releaseExpiredHolds } from '@/modules/availability/application/holds';
import { resolveGuest } from '@/modules/guests/application/resolve-guest';
import type { GuestContact } from '@/modules/guests/domain/guest-contact';
export type { GuestContact } from '@/modules/guests/domain/guest-contact';
export type ReservationOrigin = 'WEB' | 'PHONE' | 'WHATSAPP' | 'FRONT_DESK';
export type AttachGuestInput = {
  holdId: string;
  checkoutToken: string;
  contact: GuestContact;
  origin: ReservationOrigin;
  balanceDuePolicy?: 'AT_CHECKIN' | 'BEFORE_24H';
};

/** No confundir la reserva pendiente con un hold. Una búsqueda no crea reserva. */
export async function attachGuestToHold(
  ctx: TenantContext,
  input: AttachGuestInput,
): Promise<{ reservationId: string; reference: string }> {
  if (
    !input.contact.firstName.trim() ||
    !input.contact.lastName.trim() ||
    !input.contact.phone.trim()
  )
    throw new Error('Nombre, apellido y teléfono son obligatorios');
  if (input.origin === 'WEB' && !/^\S+@\S+\.\S+$/.test(input.contact.email ?? ''))
    throw new Error('Se necesita email para la reserva web');
  await releaseExpiredHolds(ctx);
  const result = await runTenantTx(ctx, async (tx) => {
    // La identidad se bloquea antes del hold para serializar intentos del mismo contacto.
    const guestId = await resolveGuest(tx, ctx.tenantId, input.contact);
    const current = resultRows<{
      unit_id: string;
      quote_id: string;
      status: string;
      expires_at: Date;
      reservation_id: string | null;
      checkout_token_hash: string | null;
    }>(
      await tx.execute(sql`
      SELECT unit_id,quote_id,status,expires_at,reservation_id,checkout_token_hash FROM reservation_holds
      WHERE tenant_id=${ctx.tenantId} AND id=${input.holdId} FOR UPDATE
    `),
    );
    const hold = current[0];
    if (
      !hold ||
      !['ACTIVE', 'VERIFYING', 'UNCERTAIN'].includes(hold.status) ||
      (hold.status === 'ACTIVE' && new Date(hold.expires_at).valueOf() <= Date.now()) ||
      !hold.checkout_token_hash ||
      createHash('sha256').update(input.checkoutToken).digest('hex') !== hold.checkout_token_hash
    )
      throw new Error('El bloqueo ya no está disponible');
    if (hold.reservation_id) {
      const [existing] = resultRows<{ id: string; reference: string; guest_id: string }>(
        await tx.execute(sql`SELECT id,reference,guest_id FROM reservations
          WHERE tenant_id=${ctx.tenantId} AND id=${hold.reservation_id}`),
      );
      if (!existing || existing.guest_id !== guestId)
        throw new Error('El checkout ya no está disponible');
      return { reservationId: existing.id, reference: existing.reference };
    }
    if (hold.status !== 'ACTIVE') throw new Error('El checkout ya no está disponible');
    if (input.origin === 'WEB') {
      const [pending] = resultRows<{ id: string }>(
        await tx.execute(sql`
        SELECT r.id FROM reservations r JOIN reservation_holds h
          ON h.tenant_id=r.tenant_id AND h.reservation_id=r.id
        WHERE r.tenant_id=${ctx.tenantId} AND r.guest_id=${guestId}
          AND r.status='PENDING_CONFIRMATION'
          AND (h.status IN ('VERIFYING','UNCERTAIN') OR
            (h.status='ACTIVE' AND (h.expires_at>now() OR h.payment_started_at IS NOT NULL
              OR EXISTS(SELECT 1 FROM payments p WHERE p.tenant_id=r.tenant_id AND p.reservation_id=r.id))))
        LIMIT 1`),
      );
      if (pending) {
        // Sólo liberamos el intento nuevo del que se probó posesión. No exponemos el anterior.
        await tx.execute(
          sql`UPDATE reservation_holds SET status='EXPIRED' WHERE tenant_id=${ctx.tenantId} AND id=${input.holdId}`,
        );
        await tx.execute(sql`UPDATE inventory_allocations SET active=false,updated_at=now()
          WHERE tenant_id=${ctx.tenantId} AND hold_id=${input.holdId} AND reason='HOLD'`);
        return null;
      }
    }
    const reservationId = randomUUID();
    const reference = `BC-${new Date().getUTCFullYear()}-${reservationId.slice(0, 8).toUpperCase()}`;
    const [quote] = resultRows<{
      checkin: string;
      checkout: string;
      adults: number;
      child_ages: number[];
      terms_version: string;
    }>(
      await tx.execute(sql`
      SELECT checkin::text,checkout::text,adults,child_ages,terms_version FROM stay_quotes WHERE tenant_id=${ctx.tenantId} AND id=${hold.quote_id}
    `),
    );
    const [tenant] = resultRows<{ balance_due_policy: string }>(
      await tx.execute(sql`SELECT balance_due_policy FROM tenants WHERE id=${ctx.tenantId}`),
    );
    await tx.execute(sql`INSERT INTO reservations
      (id,tenant_id,reference,unit_id,guest_id,quote_id,checkin,checkout,adults,child_ages,origin,balance_due_policy,terms_version)
      VALUES(${reservationId},${ctx.tenantId},${reference},${hold.unit_id},${guestId},${hold.quote_id},${quote.checkin}::date,${quote.checkout}::date,
        ${quote.adults},${sql.param(quote.child_ages)}::integer[],${input.origin},${input.balanceDuePolicy ?? tenant.balance_due_policy},${quote.terms_version})`);
    await tx.execute(
      sql`UPDATE reservation_holds SET reservation_id=${reservationId} WHERE tenant_id=${ctx.tenantId} AND id=${input.holdId}`,
    );
    return { reservationId, reference };
  });
  if (!result)
    throw new Error(
      'Ya tenés una reserva pendiente. Retomala desde este navegador o verificá tu correo y referencia en Mis reservas.',
    );
  return result;
}
