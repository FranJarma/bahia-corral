import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';

import {
  resultRows,
  runTenantTx,
  type TenantContext,
} from '@/infrastructure/db/tenant-transaction';

export type GuestContact = { firstName: string; lastName: string; phone: string; email?: string };
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
  return runTenantTx(ctx, async (tx) => {
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
      hold.status !== 'ACTIVE' ||
      new Date(hold.expires_at).valueOf() <= Date.now() ||
      hold.reservation_id ||
      !hold.checkout_token_hash ||
      createHash('sha256').update(input.checkoutToken).digest('hex') !== hold.checkout_token_hash
    )
      throw new Error('El bloqueo ya no está disponible');
    const guestId = randomUUID();
    const reservationId = randomUUID();
    const reference = `BC-${new Date().getUTCFullYear()}-${reservationId.slice(0, 8).toUpperCase()}`;
    await tx.execute(sql`INSERT INTO guests(id,tenant_id,first_name,last_name,email,phone)
      VALUES(${guestId},${ctx.tenantId},${input.contact.firstName.trim()},${input.contact.lastName.trim()},${input.contact.email?.trim().toLowerCase() ?? null},${input.contact.phone.trim()})`);
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
        ${quote.adults},${quote.child_ages},${input.origin},${input.balanceDuePolicy ?? tenant.balance_due_policy},${quote.terms_version})`);
    await tx.execute(
      sql`UPDATE reservation_holds SET reservation_id=${reservationId} WHERE tenant_id=${ctx.tenantId} AND id=${input.holdId}`,
    );
    return { reservationId, reference };
  });
}
