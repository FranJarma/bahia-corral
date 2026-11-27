import { afterEach, expect, it, vi } from 'vitest';

import { createMercadoPagoGateway } from '@/modules/payments/integrations/mercadopago';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('envía una devolución parcial a la transacción original con importe exacto e idempotencia', async () => {
  vi.stubEnv('MERCADO_PAGO_ACCESS_TOKEN', 'refund-test-token');
  let sent: { url: string; method?: string; key: string | null; body: unknown } | undefined;
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    sent = {
      url,
      method: init?.method,
      key: new Headers(init?.headers).get('X-Idempotency-Key'),
      body: JSON.parse(String(init?.body)),
    };
    return new Response(
      JSON.stringify({
        id: 'ORD_TEST',
        status: 'processed',
        status_detail: 'partially_refunded',
        transactions: {
          refunds: [
            { id: 'REF_TEST', transaction_id: 'PAY_TEST', amount: '35.01', status: 'processed' },
          ],
        },
      }),
      { status: 201 },
    );
  });
  const gateway = createMercadoPagoGateway();
  const result = await gateway.refundOrder({
    orderId: 'ORD_TEST',
    transactionId: 'PAY_TEST',
    amountCents: 3501n,
    idempotencyKey: 'stable-refund-key',
    full: false,
  });
  expect(sent).toEqual({
    url: 'https://api.mercadopago.com/v1/orders/ORD_TEST/refund',
    method: 'POST',
    key: 'stable-refund-key',
    body: { transactions: [{ id: 'PAY_TEST', amount: '35.01' }] },
  });
  expect(result.refunds).toEqual([
    { id: 'REF_TEST', transactionId: 'PAY_TEST', amountCents: 3501n, status: 'EXECUTED' },
  ]);
});

it('envía un body vacío para una devolución total de la order', async () => {
  vi.stubEnv('MERCADO_PAGO_ACCESS_TOKEN', 'refund-test-token');
  let body: unknown;
  vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
    body = JSON.parse(String(init?.body));
    return new Response(
      JSON.stringify({
        id: 'ORD_TOTAL',
        transactions: {
          refunds: [
            { id: 'REF_TOTAL', transaction_id: 'PAY_TOTAL', amount: '100.00', status: 'processed' },
          ],
        },
      }),
      { status: 201 },
    );
  });
  await createMercadoPagoGateway().refundOrder({
    orderId: 'ORD_TOTAL',
    transactionId: 'PAY_TOTAL',
    amountCents: 10000n,
    idempotencyKey: 'total-stable-key',
    full: true,
  });
  expect(body).toEqual({});
});

it('una respuesta pendiente no se presenta como dinero ya devuelto', async () => {
  vi.stubEnv('MERCADO_PAGO_ACCESS_TOKEN', 'refund-test-token');
  vi.stubGlobal(
    'fetch',
    async () =>
      new Response(
        JSON.stringify({
          id: 'ORD_PENDING',
          transactions: {
            refunds: [
              {
                id: 'REF_PENDING',
                transaction_id: 'PAY_PENDING',
                amount: '0.01',
                status: 'processing',
              },
            ],
          },
        }),
        { status: 201 },
      ),
  );
  const result = await createMercadoPagoGateway().refundOrder({
    orderId: 'ORD_PENDING',
    transactionId: 'PAY_PENDING',
    amountCents: 1n,
    idempotencyKey: 'pending-stable-key',
    full: false,
  });
  expect(result.refunds[0].status).toBe('PROCESSING');
  expect(result.refunds[0].amountCents).toBe(1n);
});

it('lee del servidor los pagos y reintegros de una order', async () => {
  vi.stubEnv('MERCADO_PAGO_ACCESS_TOKEN', 'refund-test-token');
  vi.stubGlobal(
    'fetch',
    async () =>
      new Response(
        JSON.stringify({
          id: 'ORD_READ',
          status: 'processed',
          currency: 'ARS',
          transactions: {
            payments: [{ id: 'PAY_READ', amount: '123.45', status: 'processed' }],
            refunds: [
              { id: 'REF_READ', transaction_id: 'PAY_READ', amount: '23.45', status: 'processed' },
            ],
          },
        }),
      ),
  );
  const order = await createMercadoPagoGateway().getRefundOrder('ORD_READ');
  expect(order.payments).toEqual([{ id: 'PAY_READ', amountCents: 12345n, status: 'processed' }]);
  expect(order.refunds).toEqual([
    { id: 'REF_READ', transactionId: 'PAY_READ', amountCents: 2345n, status: 'EXECUTED' },
  ]);
});

it('rechaza referencias inválidas y nunca inicia un reintegro con importe cero', async () => {
  vi.stubEnv('MERCADO_PAGO_ACCESS_TOKEN', 'refund-test-token');
  vi.stubGlobal('fetch', async () => {
    throw new Error('El proveedor no debe recibir la solicitud');
  });
  const gateway = createMercadoPagoGateway();
  await expect(
    gateway.refundOrder({
      orderId: '../orders',
      transactionId: 'PAY_TEST',
      amountCents: 1n,
      idempotencyKey: 'k',
      full: false,
    }),
  ).rejects.toThrow(/Identificador/);
  await expect(
    gateway.refundOrder({
      orderId: 'ORD_TEST',
      transactionId: 'PAY_TEST',
      amountCents: 0n,
      idempotencyKey: 'k',
      full: true,
    }),
  ).rejects.toThrow(/inválida/);
});

it('un reintegro total se reconoce como REFUNDED y no como un pago nuevo aprobado', async () => {
  vi.stubEnv('MERCADO_PAGO_ACCESS_TOKEN', 'refund-test-token');
  vi.stubGlobal(
    'fetch',
    async () =>
      new Response(
        JSON.stringify({
          id: 'ORD_REFUNDED',
          status: 'refunded',
          total_paid_amount: '100.00',
          transactions: {
            payments: [{ id: 'PAY_REFUNDED', amount: '100.00', status: 'refunded' }],
            refunds: [
              {
                id: 'REF_REFUNDED',
                transaction_id: 'PAY_REFUNDED',
                amount: '100.00',
                status: 'processed',
              },
            ],
          },
        }),
      ),
  );
  const order = await createMercadoPagoGateway().getOrder('ORD_REFUNDED');
  expect(order.status).toBe('REFUNDED');
  expect(order.refunds).toHaveLength(1);
});
