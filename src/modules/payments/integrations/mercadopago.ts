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
  status: 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'UNKNOWN' | 'REFUNDED';
  refunds?: VerifiedRefund[];
  amountCents: bigint;
  paymentId: string | null;
  paymentMethod: string;
};
export type VerifiedRefund = {
  id: string;
  transactionId: string;
  amountCents: bigint;
  status: 'EXECUTED' | 'PROCESSING' | 'FAILED';
};
export type RefundOrder = {
  id: string;
  status: string;
  currency: string;
  payments: { id: string; amountCents: bigint; status: string }[];
  refunds: VerifiedRefund[];
};
export type RefundOrderInput = {
  orderId: string;
  transactionId: string;
  amountCents: bigint;
  idempotencyKey: string;
  full: boolean;
};
export type RefundGateway = {
  getRefundOrder(id: string): Promise<RefundOrder>;
  refundOrder(input: RefundOrderInput): Promise<{ id: string; refunds: VerifiedRefund[] }>;
};
export class MercadoPagoApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super('Mercado Pago no pudo completar la solicitud.');
  }
}

/** Estos errores de creación confirman que el proveedor rechazó la solicitud antes de crear una order. */
export function isDefiniteCheckoutRejection(error: unknown): error is MercadoPagoApiError {
  return error instanceof MercadoPagoApiError && [400, 401, 403, 404, 422].includes(error.status);
}

export type PaymentGateway = RefundGateway & {
  createCheckout(input: CreateOrderInput): Promise<MercadoPagoOrder>;
  getOrder(id: string): Promise<VerifiedOrder>;
};

function providerToken() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token)
    throw new Error(
      'El pago con Mercado Pago todavía no está disponible. Contactá al complejo para continuar.',
    );
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
  const value: unknown = await response.json().catch(() => null);
  const body =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  if (!response.ok) {
    const errors = Array.isArray(body?.errors) ? body.errors : [];
    const first =
      errors[0] && typeof errors[0] === 'object' ? (errors[0] as Record<string, unknown>) : {};
    const rawCode = body?.error ?? body?.code ?? first.code;
    const code =
      typeof rawCode === 'string' && /^[a-z0-9_]{1,100}$/i.test(rawCode) ? rawCode : 'unknown';
    throw new MercadoPagoApiError(response.status, code);
  }
  if (!body) throw new Error('La respuesta de Mercado Pago no pudo verificarse.');
  return body;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Respuesta de Mercado Pago inválida.');
  return value as Record<string, unknown>;
}
function externalId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value))
    throw new Error('Identificador de Mercado Pago inválido.');
  return value;
}
function parseRefunds(raw: Record<string, unknown>): VerifiedRefund[] {
  const transactions = raw.transactions == null ? {} : record(raw.transactions);
  if (transactions.refunds == null) return [];
  if (!Array.isArray(transactions.refunds))
    throw new Error('Devoluciones de Mercado Pago no verificables.');
  return transactions.refunds.map((value: unknown) => {
    const refund = record(value);
    if (typeof refund.amount !== 'string') throw new Error('Importe de devolución no verificable.');
    const amountCents = moneyToCents(refund.amount);
    if (amountCents <= 0n) throw new Error('Importe de devolución no verificable.');
    return {
      id: externalId(refund.id),
      transactionId: externalId(refund.transaction_id),
      amountCents,
      status:
        refund.status === 'processed'
          ? ('EXECUTED' as const)
          : ['failed', 'rejected', 'canceled', 'cancelled'].includes(String(refund.status))
            ? ('FAILED' as const)
            : ('PROCESSING' as const),
    };
  });
}

export function createMercadoPagoGateway(): PaymentGateway {
  providerToken(); // Validación local antes de alterar el estado del checkout.
  return {
    async getRefundOrder(id) {
      externalId(id);
      const raw = await providerFetch('/v1/orders/' + id);
      if (externalId(raw.id) !== id) throw new Error('La order de Mercado Pago no coincide.');
      const transactions = record(raw.transactions);
      if (!Array.isArray(transactions.payments))
        throw new Error('Pagos de Mercado Pago no verificables.');
      return {
        id,
        status: String(raw.status),
        currency: typeof raw.currency === 'string' ? raw.currency : '',
        payments: transactions.payments.map((value: unknown) => {
          const payment = record(value);
          if (typeof payment.amount !== 'string')
            throw new Error('Importe del pago no verificable.');
          return {
            id: externalId(payment.id),
            amountCents: moneyToCents(payment.amount),
            status: String(payment.status),
          };
        }),
        refunds: parseRefunds(raw),
      };
    },
    async refundOrder(input) {
      externalId(input.orderId);
      externalId(input.transactionId);
      if (input.amountCents <= 0n || !input.idempotencyKey.trim())
        throw new Error('Devolución inválida.');
      const raw = await providerFetch('/v1/orders/' + input.orderId + '/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': input.idempotencyKey },
        body: JSON.stringify(
          input.full
            ? {}
            : {
                transactions: [
                  { id: input.transactionId, amount: centsToMoney(input.amountCents) },
                ],
              },
        ),
      });
      if (externalId(raw.id) !== input.orderId)
        throw new Error('La order devuelta por Mercado Pago no coincide.');
      return { id: input.orderId, refunds: parseRefunds(raw) };
    },
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
        raw.status === 'refunded'
          ? 'REFUNDED'
          : approved || raw.status === 'processed'
            ? 'APPROVED'
            : rejected || raw.status === 'cancelled'
              ? 'REJECTED'
              : ['created', 'pending', 'processing', 'action_required'].includes(String(raw.status))
                ? 'PROCESSING'
                : 'UNKNOWN';
      return {
        id: String(raw.id),
        status,
        refunds: parseRefunds(raw),
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
