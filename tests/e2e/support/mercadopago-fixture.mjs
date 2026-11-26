import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Sólo se precarga desde Playwright en su base PostgreSQL local y descartable.
const db = new URL(process.env.DATABASE_MIGRATION_URL ?? '');
if (
  !process.env.CI ||
  process.env.E2E_TEST_DATABASE !== '1' ||
  !['localhost', '127.0.0.1'].includes(db.hostname) ||
  db.pathname !== '/bahia_e2e'
) {
  throw new Error('El simulador de Mercado Pago sólo admite la base descartable de CI');
}
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.hostname !== 'api.mercadopago.com') return originalFetch(input, init);
  const match = /^\/v1\/orders\/(ORD_E2E_REFUND_(1280|390))(\/refund)?$/.exec(url.pathname);
  if (!match) return Response.json({ error: 'e2e_unknown_order' }, { status: 503 });
  const [, id, width, isRefund] = match;
  const file = join(tmpdir(), 'bahia-' + id + '.json');
  const state = existsSync(file)
    ? JSON.parse(readFileSync(file, 'utf8'))
    : { refunds: [], keys: {} };
  const payment = {
    id: 'PAY_E2E_REFUND_' + width,
    amount: '100000.00',
    paid_amount: '100000.00',
    status: 'processed',
    status_detail: 'accredited',
  };
  const order = () => ({
    id,
    status: 'processed',
    status_detail: state.refunds.length ? 'partially_refunded' : 'accredited',
    external_reference: 'E2E-REFUND-' + width,
    currency: 'ARS',
    transactions: { payments: [payment], refunds: state.refunds },
  });
  if (!isRefund) return Response.json(order());
  const key = new Headers(init?.headers).get('X-Idempotency-Key');
  if (!key || (init?.method ?? 'GET') !== 'POST')
    return Response.json({ error: 'e2e_invalid_request' }, { status: 400 });
  if (!state.keys[key]) {
    const body = JSON.parse(init.body ?? '{}');
    const amount = body.transactions?.[0]?.amount ?? '100000.00';
    const refund = {
      id: 'REF_E2E_' + width + '_' + (state.refunds.length + 1),
      transaction_id: payment.id,
      amount,
      status: 'processed',
    };
    state.refunds.push(refund);
    state.keys[key] = refund.id;
    writeFileSync(file, JSON.stringify(state));
  }
  return Response.json(order(), { status: 201 });
};
