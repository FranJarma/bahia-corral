import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { NextRequest } from 'next/server';
import postgres from 'postgres';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/admin/refunds/route';
import { getSqlClient } from '@/infrastructure/db/client';

vi.mock('server-only', () => ({}));
const identity = vi.hoisted(() => ({
  actor: null as null | {
    userId: string;
    tenantId: string;
    role: 'OWNER' | 'STAFF' | 'CLEANING';
    email: string;
  },
}));
vi.mock('@/modules/identity-access/application/admin-actor', () => ({
  getAdminActor: async () => identity.actor,
}));
let pg: Awaited<ReturnType<PostgreSqlContainer['start']>>;
let db: ReturnType<typeof postgres>;
let tenantId: string, unitId: string;
let sequence = 0;

beforeAll(async () => {
  pg = await new PostgreSqlContainer('postgres:16-alpine').start();
  db = postgres(pg.getConnectionUri(), { max: 4, prepare: false });
  await db.unsafe(readFileSync(resolve('drizzle/0001-initial.sql'), 'utf8'));
  const [tenant] =
    await db`INSERT INTO tenants(slug,name) VALUES('refund-tests','Reintegros de prueba') RETURNING id`;
  tenantId = tenant.id;
  const [unit] =
    await db`INSERT INTO accommodation_units(tenant_id,code,slug,name,type,capacity_total,published)
    VALUES(${tenantId},'REFUND','refund-cabin','Cabaña ficticia','CABIN',4,true) RETURNING id`;
  unitId = unit.id;
  await db`CREATE ROLE refund_runtime LOGIN PASSWORD 'refund_test_only' NOSUPERUSER NOBYPASSRLS`;
  await db`GRANT USAGE ON SCHEMA public TO refund_runtime`;
  await db`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO refund_runtime`;
  const runtime = new URL(pg.getConnectionUri());
  runtime.username = 'refund_runtime';
  runtime.password = 'refund_test_only';
  vi.stubEnv('DATABASE_URL', runtime.toString());
}, 120_000);

afterEach(() => {
  vi.unstubAllGlobals();
  identity.actor = null;
});
afterAll(async () => {
  await getSqlClient().end();
  await db?.end();
  await pg?.stop();
  vi.unstubAllEnvs();
});

function owner() {
  identity.actor = { userId: 'refund-owner', tenantId, role: 'OWNER', email: 'owner@example.com' };
}
async function command(data: Record<string, unknown>) {
  return POST(
    new NextRequest('http://localhost/api/admin/refunds', {
      method: 'POST',
      headers: { origin: 'http://localhost', 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  );
}
async function fixture(provider = 'MERCADO_PAGO', status = 'CANCELLED') {
  owner();
  const suffix = randomUUID().replaceAll('-', '');
  const [guest] = await db`INSERT INTO guests(tenant_id,first_name,last_name,email,phone)
    VALUES(${tenantId},'Persona','Prueba',${suffix + '@example.com'},'3870000000') RETURNING id`;
  const [quote] =
    await db`INSERT INTO stay_quotes(tenant_id,unit_id,checkin,checkout,adults,nights,amount_cents,deposit_cents,currency,terms_version)
    VALUES(${tenantId},${unitId},'2030-04-10','2030-04-11',2,'[]',1000000,500000,'ARS','v1') RETURNING id`;
  const [reservation] =
    await db`INSERT INTO reservations(tenant_id,reference,unit_id,guest_id,quote_id,checkin,checkout,adults,origin,balance_due_policy,terms_version,status)
    VALUES(${tenantId},${'REFUND-' + suffix},${unitId},${guest.id},${quote.id},'2030-04-10','2030-04-11',2,'WEB','AT_CHECKIN','v1',${status}) RETURNING id`;
  const orderId = 'ORD_' + suffix,
    transactionId = 'PAY_' + suffix;
  const [request] =
    await db`INSERT INTO payment_requests(tenant_id,reservation_id,quote_id,amount_cents,purpose,provider_order_id,status)
    VALUES(${tenantId},${reservation.id},${quote.id},1000000,'FULL',${orderId},'APPROVED') RETURNING id`;
  const [payment] =
    await db`INSERT INTO payments(tenant_id,reservation_id,request_id,amount_cents,method,provider,channel,external_id)
    VALUES(${tenantId},${reservation.id},${request.id},1000000,'CREDIT',${provider},'WEB',${transactionId}) RETURNING id`;
  return {
    reservationId: reservation.id as string,
    paymentId: payment.id as string,
    orderId,
    transactionId,
  };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
function providerFor(
  f: Fixture,
  options: { pending?: boolean; timeoutAfterCommit?: boolean; decline?: boolean } = {},
) {
  vi.stubEnv('MERCADO_PAGO_ACCESS_TOKEN', 'integration-refund-token');
  const refunds: { id: string; transaction_id: string; amount: string; status: string }[] = [];
  const sent: { key: string | null; body: { transactions?: { id: string; amount: string }[] } }[] =
    [];
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    if (!input.startsWith('https://api.mercadopago.com/v1/orders/' + f.orderId))
      throw new Error('Order inesperada en prueba');
    if (init?.method === 'POST') {
      sent.push({
        key: new Headers(init.headers).get('X-Idempotency-Key'),
        body: JSON.parse(String(init.body)),
      });
      if (options.decline)
        return new Response(
          JSON.stringify({ errors: [{ code: 'insufficient_money_for_refund' }] }),
          { status: 428 },
        );
      const body = sent[sent.length - 1].body;
      const previous = refunds.reduce((sum, r) => sum + BigInt(r.amount.replace('.', '')), 0n);
      const amount =
        body.transactions?.[0]?.amount ?? ((1000000n - previous) / 100n).toString() + '.00';
      refunds.push({
        id: 'REF_TEST_' + ++sequence,
        transaction_id: f.transactionId,
        amount,
        status: options.pending ? 'processing' : 'processed',
      });
      if (options.timeoutAfterCommit)
        throw new DOMException('Timeout simulado después del reintegro', 'TimeoutError');
    }
    return new Response(
      JSON.stringify({
        id: f.orderId,
        status: 'processed',
        currency: 'ARS',
        transactions: {
          payments: [
            {
              id: f.transactionId,
              amount: '10000.00',
              paid_amount: '10000.00',
              status: 'processed',
            },
          ],
          refunds,
        },
      }),
      { status: init?.method === 'POST' ? 201 : 200 },
    );
  });
  return { refunds, sent };
}
async function request(f: Fixture, amount = '400000', key = randomUUID()) {
  const response = await command({
    action: 'request',
    reservationId: f.reservationId,
    paymentId: f.paymentId,
    amountCents: amount,
    reason: 'Solicitud de devolución de prueba',
    idempotencyKey: key,
  });
  return { response, data: (await response.json()) as { id: string; status?: string } };
}
async function approved(f: Fixture, amount = '400000') {
  const r = await request(f, amount);
  expect(r.response.ok).toBe(true);
  const response = await command({ action: 'approve', refundId: r.data.id });
  expect(response.status).toBe(200);
  return r.data.id;
}

it('rechaza reintegros mayores al pago, importes cero y motivos vacíos', async () => {
  const f = await fixture();
  expect((await request(f, '1000001')).response.status).toBe(409);
  expect((await request(f, '0')).response.status).toBe(400);
  expect(
    (
      await command({
        action: 'request',
        reservationId: f.reservationId,
        paymentId: f.paymentId,
        amountCents: '1',
        reason: '   ',
        idempotencyKey: randomUUID(),
      })
    ).status,
  ).toBe(400);
});

it('solo tramita por Mercado Pago los cobros de Mercado Pago de reservas anuladas', async () => {
  const manual = await fixture('MANUAL');
  expect((await request(manual)).response.status).toBe(409);
  const active = await fixture('MERCADO_PAGO', 'CONFIRMED');
  expect((await request(active)).response.status).toBe(409);
});

it('un reintento conserva la misma solicitud y rechaza cambiar el importe con la misma clave', async () => {
  const f = await fixture(),
    key = randomUUID();
  const first = await request(f, '400000', key),
    retry = await request(f, '400000', key);
  expect(first.data.id).toBe(retry.data.id);
  expect((await request(f, '500000', key)).response.status).toBe(409);
  const [stored] =
    await db`SELECT count(*)::int AS count FROM refund_requests WHERE reservation_id=${f.reservationId}`;
  expect(stored.count).toBe(1);
});

it('dos solicitudes concurrentes no reservan dos veces el mismo importe', async () => {
  const f = await fixture();
  const results = await Promise.all([request(f, '700000'), request(f, '700000')]);
  expect(results.filter((r) => r.response.ok)).toHaveLength(1);
  expect(results.find((r) => !r.response.ok)?.response.status).toBe(409);
});

it('Personal administrativo puede solicitar pero no aprobar ni enviar dinero', async () => {
  const f = await fixture();
  identity.actor!.role = 'STAFF';
  const first = await request(f);
  expect(first.response.ok).toBe(true);
  expect((await command({ action: 'approve', refundId: first.data.id })).status).toBe(403);
  expect((await command({ action: 'execute', refundId: first.data.id })).status).toBe(403);
});

it('no marca como ejecutada una devolución si Mercado Pago no está configurado', async () => {
  const f = await fixture(),
    id = await approved(f);
  vi.stubEnv('MERCADO_PAGO_ACCESS_TOKEN', '');
  const response = await command({ action: 'execute', refundId: id });
  expect(response.status).toBe(409);
  const [stored] = await db`SELECT status FROM refund_requests WHERE id=${id}`;
  expect(stored.status).toBe('APPROVED');
});

it('envía una devolución total una sola vez aunque se pulse tres veces', async () => {
  const f = await fixture(),
    remote = providerFor(f),
    id = await approved(f, '1000000');
  const results = await Promise.all([
    command({ action: 'execute', refundId: id }),
    command({ action: 'execute', refundId: id }),
    command({ action: 'execute', refundId: id }),
  ]);
  expect(results.every((r) => [200, 202].includes(r.status))).toBe(true);
  expect(remote.sent).toHaveLength(1);
  expect(remote.sent[0].key).toBe(id);
  expect(remote.sent[0].body).toEqual({});
  const [stored] = await db`SELECT status,provider_refund_id FROM refund_requests WHERE id=${id}`;
  expect(stored.status).toBe('EXECUTED');
  expect(stored.provider_refund_id).toBe(remote.refunds[0].id);
  const [reservation] = await db`SELECT status FROM reservations WHERE id=${f.reservationId}`;
  expect(reservation.status).toBe('CANCELLED');
});

it('admite reintegros parciales sucesivos y descuenta los importes ya devueltos', async () => {
  const f = await fixture(),
    remote = providerFor(f);
  const first = await approved(f, '400000');
  expect((await command({ action: 'execute', refundId: first })).status).toBe(200);
  expect((await request(f, '600001')).response.status).toBe(409);
  const second = await approved(f, '600000');
  expect((await command({ action: 'execute', refundId: second })).status).toBe(200);
  expect(remote.sent[0].body).toEqual({
    transactions: [{ id: f.transactionId, amount: '4000.00' }],
  });
  expect(remote.sent[1].body).toEqual({
    transactions: [{ id: f.transactionId, amount: '6000.00' }],
  });
  expect((await request(f, '1')).response.status).toBe(409);
});

it('concilia un timeout posterior al reintegro sin repetir el movimiento de dinero', async () => {
  const f = await fixture(),
    remote = providerFor(f, { timeoutAfterCommit: true }),
    id = await approved(f);
  const sent = await command({ action: 'execute', refundId: id });
  expect(sent.status).toBe(202);
  const [uncertain] = await db`SELECT status FROM refund_requests WHERE id=${id}`;
  expect(uncertain.status).toBe('UNCERTAIN');
  expect((await request(f, '100000')).response.status).toBe(409);
  expect((await command({ action: 'reconcile', refundId: id })).status).toBe(200);
  expect((await command({ action: 'reconcile', refundId: id })).status).toBe(200);
  expect(remote.sent).toHaveLength(1);
  const [stored] = await db`SELECT status,provider_refund_id FROM refund_requests WHERE id=${id}`;
  expect(stored.status).toBe('EXECUTED');
  expect(stored.provider_refund_id).toBe(remote.refunds[0].id);
  const [count] =
    await db`SELECT count(*)::int AS count FROM refund_requests WHERE reservation_id=${f.reservationId}`;
  expect(count.count).toBe(1);
});

it('un reintegro en procesamiento no se acredita hasta verificar la evidencia final', async () => {
  const f = await fixture(),
    remote = providerFor(f, { pending: true }),
    id = await approved(f);
  expect((await command({ action: 'execute', refundId: id })).status).toBe(202);
  const [pending] = await db`SELECT status,executed_at FROM refund_requests WHERE id=${id}`;
  expect(pending.status).toBe('PROCESSING');
  expect(pending.executed_at).toBeNull();
  remote.refunds[0].status = 'processed';
  expect((await command({ action: 'reconcile', refundId: id })).status).toBe(200);
  const [done] = await db`SELECT status,executed_at FROM refund_requests WHERE id=${id}`;
  expect(done.status).toBe('EXECUTED');
  expect(done.executed_at).not.toBeNull();
});

it('un rechazo confirmado conserva el historial y permite una nueva solicitud', async () => {
  const f = await fixture();
  providerFor(f, { decline: true });
  const id = await approved(f);
  expect((await command({ action: 'execute', refundId: id })).status).toBe(200);
  const [failed] = await db`SELECT status FROM refund_requests WHERE id=${id}`;
  expect(failed.status).toBe('FAILED');
  expect((await request(f, '1000000')).response.status).toBe(201);
});

it('no permite operar una devolución de otro complejo ni simular una ejecución antigua', async () => {
  const f = await fixture(),
    id = await approved(f);
  const [other] =
    await db`INSERT INTO tenants(slug,name) VALUES('refund-other','Otro complejo') RETURNING id`;
  identity.actor!.tenantId = other.id;
  expect((await command({ action: 'execute', refundId: id })).status).toBe(404);
  owner();
  const [legacy] =
    await db`INSERT INTO refund_requests(tenant_id,reservation_id,amount_cents,reason,status)
    VALUES(${tenantId},${f.reservationId},100,'Solicitud histórica','APPROVED') RETURNING id`;
  expect((await command({ action: 'execute', refundId: legacy.id })).status).toBe(409);
});
