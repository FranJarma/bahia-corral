import { createHmac, timingSafeEqual } from 'node:crypto';

import { centsToMoney, moneyToCents } from '@/modules/payments/domain/money';

export type CreateOrderInput = {
  idempotencyKey: string;
  reservationReference: string;
  email: string;
  amountCents: bigint;
  description: string;
};
export type MercadoPagoOrder = { id: string; checkoutUrl: string; status: string };
export type VerifiedOrder = {
  id: string;
  status: 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'UNKNOWN';
  amountCents: bigint;
  paymentId: string | null;
  paymentMethod: string;
};
export type PaymentGateway = {
  createCheckout(input: CreateOrderInput): Promise<MercadoPagoOrder>;
  getOrder(id: string): Promise<VerifiedOrder>;
};

function providerToken() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) throw new Error('Mercado Pago sin credenciales en este ambiente');
  return token;
}
async function providerFetch(path: string, options?: RequestInit) {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${providerToken()}`,
      Accept: 'application/json',
      ...options?.headers,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000),
  });
  const body = (await response.json()) as Record<string, unknown>;
  if (!response.ok) throw new Error(`Mercado Pago devolvió HTTP ${response.status}`);
  return body;
}
export function createMercadoPagoGateway(): PaymentGateway {
  return {
    async createCheckout(input) {
      const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const amount = centsToMoney(input.amountCents);
      const body = {
        type: 'online',
        processing_mode: 'manual',
        capture_mode: 'automatic_async',
        total_amount: amount,
        external_reference: input.reservationReference,
        description: input.description,
        payer: { email: input.email },
        items: [{ title: input.description, unit_price: amount, quantity: 1 }],
        expiration_time: 'PT15M',
        config: {
          online: {
            success_url: `${base}/reservas/resultado?estado=success`,
            failure_url: `${base}/reservas/resultado?estado=failure`,
            pending_url: `${base}/reservas/resultado?estado=pending`,
            auto_return: 'all',
          },
          payment_method: { not_allowed_types: ['ticket'] },
        },
      };
      const data = await providerFetch('/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': input.idempotencyKey },
        body: JSON.stringify(body),
      });
      if (typeof data.id !== 'string' || typeof data.checkout_url !== 'string')
        throw new Error('La respuesta de Mercado Pago no contiene una URL de pago');
      return { id: data.id, checkoutUrl: data.checkout_url, status: String(data.status) };
    },
    async getOrder(id) {
      if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('Identificador externo inválido');
      const raw = await providerFetch(`/v1/orders/${id}`);
      const transactions = raw.transactions as
        | {
            payments?: Array<{
              id?: string | number;
              status?: string;
              status_detail?: string;
              payment_method?: { id?: string };
            }>;
          }
        | undefined;
      const approved = transactions?.payments?.find(
        (p) => p.status === 'approved' || p.status === 'processed',
      );
      const rejected = transactions?.payments?.find((p) => p.status === 'rejected');
      const status =
        approved || raw.status === 'processed'
          ? 'APPROVED'
          : rejected || raw.status === 'cancelled'
            ? 'REJECTED'
            : ['created', 'pending', 'processing', 'action_required'].includes(String(raw.status))
              ? 'PROCESSING'
              : 'UNKNOWN';
      return {
        id: String(raw.id),
        status,
        amountCents: moneyToCents(String(raw.total_paid_amount ?? '0')),
        paymentId: approved?.id == null ? null : String(approved.id),
        paymentMethod: approved?.payment_method?.id ?? 'MERCADO_PAGO',
      };
    },
  };
}

export function verifyMercadoPagoWebhook(input: {
  signature: string | null;
  requestId: string | null;
  dataId: string;
  secret: string;
}): boolean {
  const parts = Object.fromEntries(
    (input.signature ?? '').split(',').map((part) => part.trim().split('=')),
  );
  if (
    !parts.ts ||
    !parts.v1 ||
    !input.requestId ||
    !input.dataId ||
    !/^[a-f0-9]{64}$/i.test(parts.v1)
  )
    return false;
  const manifest = `id:${input.dataId.toLowerCase()};request-id:${input.requestId};ts:${parts.ts};`;
  const expected = createHmac('sha256', input.secret).update(manifest).digest();
  const got = Buffer.from(parts.v1, 'hex');
  return expected.length === got.length && timingSafeEqual(expected, got);
}
