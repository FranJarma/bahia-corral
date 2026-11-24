import { createHmac, randomBytes, randomInt } from 'node:crypto';

import { sql } from 'drizzle-orm';

import { getDefaultTenantId } from '@/infrastructure/db/get-tenant';
import { resultRows, runTenantTx } from '@/infrastructure/db/tenant-transaction';
import { sendMail } from '@/infrastructure/email/mail-port';

function codeHash(code: string, challengeId: string) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('BETTER_AUTH_SECRET no configurado');
  return createHmac('sha256', secret).update(`${challengeId}:${code}`).digest('hex');
}
function grantHash(token: string) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('BETTER_AUTH_SECRET no configurado');
  return createHmac('sha256', secret).update(`guest:${token}`).digest('hex');
}

export async function requestReservationOtp(reference: string, email: string): Promise<void> {
  const tenantId = await getDefaultTenantId();
  const cleanEmail = email.trim().toLowerCase();
  const ctx = { tenantId, actorId: 'guest-otp', actorType: 'SYSTEM' as const };
  const challenge = await runTenantTx(ctx, async (tx) => {
    const records = resultRows<{ id: string }>(
      await tx.execute(sql`
      SELECT r.id FROM reservations r JOIN guests g ON g.tenant_id=r.tenant_id AND g.id=r.guest_id
      WHERE r.tenant_id=${tenantId} AND r.reference=${reference} AND lower(g.email)=${cleanEmail}
      AND r.status NOT IN ('NOT_COMPLETED') LIMIT 1`),
    );
    if (!records[0]) return null; // respuesta HTTP genérica para evitar enumeración
    const today = resultRows<{ count: string }>(
      await tx.execute(sql`
      SELECT count(*)::text AS count FROM guest_otp_challenges
      WHERE tenant_id=${tenantId} AND reservation_id=${records[0].id} AND created_at>now()-interval '1 hour'`),
    );
    if (Number(today[0].count) >= 5) return null;
    await tx.execute(sql`UPDATE guest_otp_challenges SET consumed_at=now()
      WHERE tenant_id=${tenantId} AND reservation_id=${records[0].id} AND consumed_at IS NULL`);
    const id = crypto.randomUUID();
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await tx.execute(sql`INSERT INTO guest_otp_challenges(id,tenant_id,reservation_id,email,code_hash,expires_at)
      VALUES(${id},${tenantId},${records[0].id},${cleanEmail},${codeHash(code, id)},now()+interval '5 minutes')`);
    return { id, code };
  });
  if (challenge) {
    await sendMail({
      to: cleanEmail,
      subject: 'Tu código de acceso a Bahía Corral',
      html: `<p>Tu código de acceso de un solo uso es <strong>${challenge.code}</strong>.</p><p>Vence en cinco minutos. Si no lo solicitaste, ignorá este mensaje.</p>`,
    });
  }
}

export async function verifyReservationOtp(
  reference: string,
  email: string,
  code: string,
): Promise<string | null> {
  if (!/^\d{6}$/.test(code)) return null;
  const tenantId = await getDefaultTenantId();
  const cleanEmail = email.trim().toLowerCase();
  return runTenantTx({ tenantId, actorId: 'guest-otp', actorType: 'SYSTEM' }, async (tx) => {
    const found = resultRows<{
      id: string;
      reservation_id: string;
      attempts: number;
      code_hash: string;
    }>(
      await tx.execute(sql`
      SELECT o.id,o.reservation_id,o.attempts,o.code_hash FROM guest_otp_challenges o
      JOIN reservations r ON r.tenant_id=o.tenant_id AND r.id=o.reservation_id
      WHERE o.tenant_id=${tenantId} AND r.reference=${reference} AND o.email=${cleanEmail}
      AND o.expires_at>now() AND o.consumed_at IS NULL
      ORDER BY o.created_at DESC LIMIT 1 FOR UPDATE OF o`),
    );
    const challenge = found[0];
    if (!challenge || challenge.attempts >= 3) return null;
    await tx.execute(
      sql`UPDATE guest_otp_challenges SET attempts=attempts+1 WHERE tenant_id=${tenantId} AND id=${challenge.id}`,
    );
    if (codeHash(code, challenge.id) !== challenge.code_hash) return null;
    await tx.execute(
      sql`UPDATE guest_otp_challenges SET consumed_at=now() WHERE tenant_id=${tenantId} AND id=${challenge.id}`,
    );
    const token = randomBytes(32).toString('base64url');
    await tx.execute(sql`INSERT INTO guest_access_grants(tenant_id,reservation_id,token_hash,expires_at)
      VALUES(${tenantId},${challenge.reservation_id},${grantHash(token)},now()+interval '24 hours')`);
    return token;
  });
}

export async function getGuestReservation(reference: string, token: string) {
  const tenantId = await getDefaultTenantId();
  return runTenantTx({ tenantId, actorId: 'guest-portal', actorType: 'SYSTEM' }, async (tx) => {
    const rows = resultRows<{
      reference: string;
      checkin: string;
      checkout: string;
      status: string;
      unit_name: string;
      amount_cents: string;
      paid_cents: string;
    }>(
      await tx.execute(sql`
      SELECT r.reference,r.checkin::text,r.checkout::text,r.status,u.name AS unit_name,
      q.amount_cents::text,COALESCE((SELECT SUM(p.amount_cents) FROM payments p WHERE p.tenant_id=r.tenant_id AND p.reservation_id=r.id),0)::text AS paid_cents
      FROM guest_access_grants a JOIN reservations r ON r.tenant_id=a.tenant_id AND r.id=a.reservation_id
      JOIN accommodation_units u ON u.tenant_id=r.tenant_id AND u.id=r.unit_id
      JOIN stay_quotes q ON q.tenant_id=r.tenant_id AND q.id=r.quote_id
      WHERE a.tenant_id=${tenantId} AND a.token_hash=${grantHash(token)} AND a.expires_at>now()
      AND a.revoked_at IS NULL AND r.reference=${reference} LIMIT 1`),
    );
    return rows[0] ?? null;
  });
}
