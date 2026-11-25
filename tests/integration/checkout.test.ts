import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { getSqlClient } from '@/infrastructure/db/client';
import { startCheckout } from '@/modules/availability/application/holds';
import { attachGuestToHold } from '@/modules/reservations/application/attach-guest';
import { confirmReservation } from '@/modules/reservations/application/confirm-reservation';
import { modifyReservation } from '@/modules/reservations/application/modify-reservation';

// El guard de Next.js no se ejecuta fuera de su runtime; la BD y los casos de uso son reales.
vi.mock('server-only', () => ({}));

let pg: Awaited<ReturnType<PostgreSqlContainer['start']>>;
let db: ReturnType<typeof postgres>;
let tenantId: string;
let unitId: string;
let runtimeReady = false;

beforeAll(async () => {
  pg = await new PostgreSqlContainer('postgres:16-alpine').start();
  db = postgres(pg.getConnectionUri(), { max: 2, prepare: false });
  await db.unsafe(readFileSync(resolve('drizzle/0001-initial.sql'), 'utf8'));
  const [tenant] = await db`INSERT INTO tenants(slug,name) VALUES('checkout-test','Checkout test') RETURNING id`;
  tenantId = tenant.id;
  const [unit] = await db`INSERT INTO accommodation_units(tenant_id,code,slug,name,type,capacity_total,published)
    VALUES(${tenantId},'TEST','checkout-cabin','Cabaña de prueba','CABIN',8,true) RETURNING id`;
  unitId = unit.id;
  await db`INSERT INTO base_rates(tenant_id,unit_id,min_guests,max_guests,amount_cents)
    VALUES(${tenantId},${unitId},1,8,14000000)`;
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
    { childAges: [], checkin: '2027-03-01', checkout: '2027-03-02', nextCheckin: '2027-03-11', nextCheckout: '2027-03-12' },
    { childAges: [3], checkin: '2027-03-03', checkout: '2027-03-04', nextCheckin: '2027-03-13', nextCheckout: '2027-03-14' },
    { childAges: [3, 7], checkin: '2027-03-05', checkout: '2027-03-06', nextCheckin: '2027-03-15', nextCheckout: '2027-03-16' },
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
    expect(quote.nights).toEqual([{ date: input.checkin, amountCents: '14000000', source: 'BASE' }]);

    const { reservationId } = await attachGuestToHold(ctx, {
      holdId: hold.holdId,
      checkoutToken: hold.checkoutToken,
      origin: 'WEB',
      contact: { firstName: 'Prueba', lastName: 'Checkout', email: 'checkout@example.com', phone: '3870000000' },
    });
    const [reservation] = await db`SELECT child_ages,status FROM reservations WHERE id=${reservationId}`;
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
    const [changed] = await db`SELECT child_ages,checkin::text AS checkin FROM reservations WHERE id=${reservationId}`;
    expect(changed.child_ages).toEqual(input.childAges);
    expect(changed.checkin).toBe(input.nextCheckin);
  });
});
