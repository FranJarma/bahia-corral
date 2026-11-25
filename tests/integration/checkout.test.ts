import { createHmac, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { NextRequest } from 'next/server';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { POST as verifyGuestOtp } from '@/app/api/public/otp/verify/route';
import { getSqlClient } from '@/infrastructure/db/client';
import { getCheckoutSession } from '@/modules/availability/application/checkout-session';
import { releaseExpiredHolds, startCheckout } from '@/modules/availability/application/holds';
import { searchAvailability } from '@/modules/availability/application/search-availability';
import { createPaymentRequest } from '@/modules/payments/application/create-payment-request';
import { attachGuestToHold } from '@/modules/reservations/application/attach-guest';
import { confirmReservation } from '@/modules/reservations/application/confirm-reservation';
import { listReservations } from '@/modules/reservations/application/list-reservations';
import { modifyReservation } from '@/modules/reservations/application/modify-reservation';

// El guard de Next.js no se ejecuta fuera de su runtime; la BD y los casos de uso son reales.
vi.mock('server-only', () => ({}));

let pg: Awaited<ReturnType<PostgreSqlContainer['start']>>;
let db: ReturnType<typeof postgres>;
let tenantId: string;
let unitId: string;
let runtimeReady = false;
let legacyGuestIds: string[] = [];
const legacyReservationIds: string[] = [];

beforeAll(async () => {
  pg = await new PostgreSqlContainer('postgres:16-alpine').start();
  db = postgres(pg.getConnectionUri(), { max: 2, prepare: false });
  await db.unsafe(readFileSync(resolve('drizzle/0001-initial.sql'), 'utf8'));
  const [tenant] =
    await db`INSERT INTO tenants(slug,name) VALUES('checkout-test','Checkout test') RETURNING id`;
  tenantId = tenant.id;
  const [unit] =
    await db`INSERT INTO accommodation_units(tenant_id,code,slug,name,type,capacity_total,published)
    VALUES(${tenantId},'TEST','checkout-cabin','Cabaña de prueba','CABIN',8,true) RETURNING id`;
  unitId = unit.id;
  await db`INSERT INTO base_rates(tenant_id,unit_id,min_guests,max_guests,amount_cents)
    VALUES(${tenantId},${unitId},1,8,14000000)`;
  const legacy = await db`INSERT INTO guests(tenant_id,first_name,last_name,email,phone) VALUES
    (${tenantId},'Persona','Anterior','legacy@example.com','3870000000'),
    (${tenantId},'Persona','Anterior','LEGACY@example.com','3870000000') RETURNING id`;
  legacyGuestIds = legacy.map((row) => row.id);
  for (const guest of legacy) {
    const [quote] =
      await db`INSERT INTO stay_quotes(tenant_id,unit_id,checkin,checkout,adults,nights,amount_cents,deposit_cents,currency,terms_version)
      VALUES(${tenantId},${unitId},'2027-07-01','2027-07-02',2,'[]',14000000,7000000,'ARS','v1') RETURNING id`;
    const [reservation] =
      await db`INSERT INTO reservations(tenant_id,reference,unit_id,guest_id,quote_id,checkin,checkout,adults,origin,balance_due_policy,terms_version,status)
      VALUES(${tenantId},${'LEGACY-' + guest.id},${unitId},${guest.id},${quote.id},'2027-07-01','2027-07-02',2,'PHONE','AT_CHECKIN','v1','COMPLETED') RETURNING id`;
    legacyReservationIds.push(reservation.id);
    await db`INSERT INTO payments(tenant_id,reservation_id,amount_cents,method,provider,channel)
      VALUES(${tenantId},${reservation.id},10000,'CASH','MANUAL','MANUAL')`;
  }
  await db.unsafe(readFileSync(resolve('drizzle/0003-guest-identity.sql'), 'utf8'));
  await db.unsafe(readFileSync(resolve('drizzle/0003-guest-identity.sql'), 'utf8'));
  await db`CREATE ROLE checkout_runtime LOGIN PASSWORD 'test_checkout_password' NOSUPERUSER NOBYPASSRLS`;
  await db`GRANT USAGE ON SCHEMA public TO checkout_runtime`;
  await db`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO checkout_runtime`;
  const runtimeUrl = new URL(pg.getConnectionUri());
  runtimeUrl.username = 'checkout_runtime';
  runtimeUrl.password = 'test_checkout_password';
  vi.stubEnv('DATABASE_URL', runtimeUrl.toString());
  vi.stubEnv('BAHIA_DEFAULT_TENANT_SLUG', 'checkout-test');
  runtimeReady = true;
}, 120_000);

afterAll(async () => {
  if (runtimeReady) await getSqlClient().end();
  await db?.end();
  await pg?.stop();
  vi.unstubAllEnvs();
});

describe('Checkout real con edades de menores', () => {
  it.each([
    {
      childAges: [],
      checkin: '2027-03-01',
      checkout: '2027-03-02',
      nextCheckin: '2027-03-11',
      nextCheckout: '2027-03-12',
    },
    {
      childAges: [3],
      checkin: '2027-03-03',
      checkout: '2027-03-04',
      nextCheckin: '2027-03-13',
      nextCheckout: '2027-03-14',
    },
    {
      childAges: [3, 7],
      checkin: '2027-03-05',
      checkout: '2027-03-06',
      nextCheckin: '2027-03-15',
      nextCheckout: '2027-03-16',
    },
  ])('guarda las edades $childAges desde la cotización hasta una modificación', async (input) => {
    const ctx = { tenantId, actorId: 'checkout-tests', actorType: 'SYSTEM' as const };
    const hold = await startCheckout(ctx, {
      unitId,
      checkin: input.checkin,
      checkout: input.checkout,
      adults: 2,
      childAges: input.childAges,
    });
    expect(hold.totalCents).toBe('14000000');
    expect(hold.depositCents).toBe('7000000');
    const [quote] = await db`SELECT child_ages,nights FROM stay_quotes WHERE id=${hold.quoteId}`;
    expect(quote.child_ages).toEqual(input.childAges);
    expect(quote.nights).toEqual([
      { date: input.checkin, amountCents: '14000000', source: 'BASE' },
    ]);

    const { reservationId } = await attachGuestToHold(ctx, {
      holdId: hold.holdId,
      checkoutToken: hold.checkoutToken,
      origin: 'WEB',
      contact: {
        firstName: 'Prueba',
        lastName: 'Checkout',
        email: 'checkout@example.com',
        phone: '3870000000',
      },
    });
    const [reservation] =
      await db`SELECT child_ages,status FROM reservations WHERE id=${reservationId}`;
    expect(reservation.child_ages).toEqual(input.childAges);
    expect(reservation.status).toBe('PENDING_CONFIRMATION');

    await confirmReservation(ctx, {
      reservationId,
      exceptional: { role: 'OWNER', reason: 'Prueba de reserva administrativa sin seña' },
    });
    await modifyReservation(ctx, {
      reservationId,
      unitId,
      checkin: input.nextCheckin,
      checkout: input.nextCheckout,
      adults: 2,
      childAges: input.childAges,
      reason: 'Prueba de cambio de fechas',
    });
    const [changed] =
      await db`SELECT child_ages,checkin::text AS checkin FROM reservations WHERE id=${reservationId}`;
    expect(changed.child_ages).toEqual(input.childAges);
    expect(changed.checkin).toBe(input.nextCheckin);
  });
});

const checkoutContext = () => ({
  tenantId,
  actorId: 'checkout-tests',
  actorType: 'SYSTEM' as const,
});
const guestContact = (email: string) => ({
  firstName: 'Persona',
  lastName: 'Prueba',
  email,
  phone: '3870000000',
});
async function checkoutAt(checkin: string) {
  return startCheckout(checkoutContext(), {
    unitId,
    checkin,
    checkout: new Date(Date.parse(checkin) + 86400000).toISOString().slice(0, 10),
    adults: 2,
    childAges: [],
  });
}
async function identify(hold: Awaited<ReturnType<typeof startCheckout>>, email: string) {
  return attachGuestToHold(checkoutContext(), {
    holdId: hold.holdId,
    checkoutToken: hold.checkoutToken,
    origin: 'WEB',
    contact: guestContact(email),
  });
}

describe('Continuidad de la reserva y vencimiento', () => {
  it('un reintento de contacto conserva la misma reserva y el mismo huésped', async () => {
    const hold = await checkoutAt('2027-06-01');
    const first = await identify(hold, 'retry@example.com');
    const retry = await identify(hold, 'retry@example.com');
    expect(retry).toEqual(first);
    const [counts] =
      await db`SELECT count(*)::int AS count FROM reservations WHERE quote_id=${hold.quoteId}`;
    expect(counts.count).toBe(1);
  });

  it('dos intentos concurrentes del mismo correo no crean dos reservas pendientes', async () => {
    const first = await checkoutAt('2027-06-03'),
      second = await checkoutAt('2027-06-05');
    const results = await Promise.allSettled([
      identify(first, 'concurrent@example.com'),
      identify(second, 'CONCURRENT@example.com'),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const [counts] =
      await db`SELECT count(*)::int AS count FROM reservations r JOIN guests g ON g.id=r.guest_id
      WHERE lower(trim(g.email))='concurrent@example.com' AND r.status='PENDING_CONFIRMATION'`;
    expect(counts.count).toBe(1);
    const [guests] =
      await db`SELECT count(*)::int AS count FROM guests WHERE lower(trim(email))='concurrent@example.com'`;
    expect(guests.count).toBe(1);
  });

  it('al vencer un intento lo archiva y permite otro sin duplicar al huésped', async () => {
    const first = await checkoutAt('2027-06-07');
    const old = await identify(first, 'reuse@example.com');
    await db`UPDATE reservation_holds SET expires_at=now()-interval '1 second' WHERE id=${first.holdId}`;
    const rows = await listReservations(checkoutContext());
    expect(rows.find((r) => r.id === old.reservationId)?.status).toBe('NOT_COMPLETED');
    const second = await checkoutAt('2027-06-07');
    const next = await identify(second, 'REUSE@example.com');
    expect(next.reservationId).not.toBe(old.reservationId);
    const ids =
      await db`SELECT DISTINCT guest_id FROM reservations WHERE id IN (${old.reservationId},${next.reservationId})`;
    expect(ids).toHaveLength(1);
  });

  it('una búsqueda libera disponibilidad vencida sin depender del worker', async () => {
    const hold = await checkoutAt('2027-06-09');
    await db`UPDATE reservation_holds SET expires_at=now()-interval '1 second' WHERE id=${hold.holdId}`;
    const units = await searchAvailability(checkoutContext(), {
      checkin: '2027-06-09',
      checkout: '2027-06-10',
      guests: 2,
    });
    expect(units.some((u) => u.id === unitId)).toBe(true);
    const [stored] = await db`SELECT status FROM reservation_holds WHERE id=${hold.holdId}`;
    expect(stored.status).toBe('EXPIRED');
  });

  it.each(['VERIFYING', 'UNCERTAIN'])(
    'no libera un pago en estado %s aunque venza el plazo',
    async (status) => {
      const date = status === 'VERIFYING' ? '2027-06-11' : '2027-06-13';
      const hold = await checkoutAt(date),
        reservation = await identify(hold, status.toLowerCase() + '@example.com');
      await db`UPDATE reservation_holds SET status=${status},payment_started_at=now()-interval '20 minutes',
      expires_at=now()-interval '10 minutes',verification_deadline=now()-interval '5 minutes' WHERE id=${hold.holdId}`;
      await releaseExpiredHolds(checkoutContext());
      const [stored] =
        await db`SELECT status FROM reservations WHERE id=${reservation.reservationId}`;
      expect(stored.status).toBe('PENDING_CONFIRMATION');
      const [allocation] =
        await db`SELECT active FROM inventory_allocations WHERE hold_id=${hold.holdId}`;
      expect(allocation.active).toBe(true);
    },
  );
});

it('un proveedor sin configurar no marca un pago como iniciado', async () => {
  vi.stubEnv('MERCADO_PAGO_ACCESS_TOKEN', '');
  const hold = await checkoutAt('2027-06-15');
  const reservation = await identify(hold, 'no-provider@example.com');
  await expect(
    createPaymentRequest(checkoutContext(), {
      reservationId: reservation.reservationId,
      checkoutToken: hold.checkoutToken,
      purpose: 'DEPOSIT',
    }),
  ).rejects.toThrow(/credenciales/);
  const [stored] =
    await db`SELECT status,payment_started_at FROM reservation_holds WHERE id=${hold.holdId}`;
  expect(stored.status).toBe('ACTIVE');
  expect(stored.payment_started_at).toBeNull();
  const [requests] =
    await db`SELECT count(*)::int AS count FROM payment_requests WHERE reservation_id=${reservation.reservationId}`;
  expect(requests.count).toBe(0);
});

it('la consolidación conserva las reservas y pagos existentes y es repetible', async () => {
  const guests =
    await db`SELECT id,merged_into_id FROM guests WHERE id IN (${legacyGuestIds[0]},${legacyGuestIds[1]})`;
  expect(guests).toHaveLength(2);
  expect(guests.filter((g) => g.merged_into_id === null)).toHaveLength(1);
  const rows =
    await db`SELECT DISTINCT guest_id FROM reservations WHERE id IN (${legacyReservationIds[0]},${legacyReservationIds[1]})`;
  expect(rows).toHaveLength(1);
  const [payments] = await db`SELECT count(*)::int AS count,sum(amount_cents)::text AS paid
    FROM payments WHERE reservation_id IN (${legacyReservationIds[0]},${legacyReservationIds[1]})`;
  expect(payments.count).toBe(2);
  expect(payments.paid).toBe('20000');
  const [audit] =
    await db`SELECT count(*)::int AS count FROM audit_events WHERE action='GUEST_CONSOLIDATED'`;
  expect(audit.count).toBe(1);
});

it('un OTP válido recupera sólo el checkout de esa reserva en otro dispositivo', async () => {
  const secret = 'isolated-checkout-otp-secret-for-tests';
  vi.stubEnv('BETTER_AUTH_SECRET', secret);
  const hold = await checkoutAt('2027-06-17');
  const reservation = await identify(hold, 'recover@example.com');
  const id = randomUUID(),
    code = '123456';
  const codeHash = createHmac('sha256', secret)
    .update(id + ':' + code)
    .digest('hex');
  await db`INSERT INTO guest_otp_challenges(id,tenant_id,reservation_id,email,code_hash,expires_at)
    VALUES(${id},${tenantId},${reservation.reservationId},'recover@example.com',${codeHash},now()+interval '5 minutes')`;
  const response = await verifyGuestOtp(
    new NextRequest('http://localhost/api/public/otp/verify', {
      method: 'POST',
      headers: { origin: 'http://localhost', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference: reservation.reference,
        email: 'recover@example.com',
        code,
      }),
    }),
  );
  expect(response.status).toBe(200);
  const token = response.cookies.get('bahia_checkout')?.value;
  const session = await getCheckoutSession(checkoutContext(), token);
  expect(session?.reservationId).toBe(reservation.reservationId);
  expect(session?.expiresAt).toBe(hold.expiresAt);
  expect(await getCheckoutSession(checkoutContext(), 'x'.repeat(43))).toBeNull();
  // La credencial antigua queda invalidada tras la recuperación verificada.
  expect(await getCheckoutSession(checkoutContext(), hold.checkoutToken)).toBeNull();
});
