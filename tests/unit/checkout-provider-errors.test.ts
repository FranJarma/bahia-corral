import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/public/checkout/pay/route';
import { createPaymentRequest } from '@/modules/payments/application/create-payment-request';
import { MercadoPagoApiError } from '@/modules/payments/integrations/mercadopago';

vi.mock('server-only', () => ({}));
vi.mock('@/infrastructure/db/get-tenant', () => ({
  getDefaultTenantId: async () => '11111111-1111-4111-8111-111111111111',
}));
vi.mock('@/modules/payments/application/create-payment-request', () => ({
  createPaymentRequest: vi.fn(),
}));

afterEach(() => vi.restoreAllMocks());

function paymentRequest() {
  return new NextRequest('http://localhost/api/public/checkout/pay', {
    method: 'POST',
    headers: { origin: 'http://localhost', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reservationId: '22222222-2222-4222-8222-222222222222',
      checkoutToken: 'test-checkout-token-'.repeat(3),
      purpose: 'DEPOSIT',
    }),
  });
}

describe('errores al iniciar el pago público', () => {
  it.each([401, 403])(
    'explica la indisponibilidad del proveedor HTTP %s sin atribuirla al huésped',
    async (status) => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(createPaymentRequest).mockRejectedValue(
        new MercadoPagoApiError(status, 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES'),
      );
      const response = await POST(paymentRequest());
      expect(response.status).toBe(503);
      const body = await response.json();
      expect(body.code).toBe('PAYMENT_PROVIDER_UNAVAILABLE');
      expect(body.error).toMatch(/pago online.*disponible/i);
      expect(body.error).toMatch(/complejo/i);
      expect(JSON.stringify(body)).not.toContain('PA_UNAUTHORIZED');
    },
  );

  it('distingue un resultado incierto y conserva el diagnóstico seguro en los logs', async () => {
    const logs = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(createPaymentRequest).mockRejectedValue(
      new MercadoPagoApiError(500, 'internal_error'),
    );
    const response = await POST(paymentRequest());
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.code).toBe('PAYMENT_STATUS_UNCERTAIN');
    expect(body.error).toMatch(/verificar|verificando/i);
    expect(body.error).toMatch(/nuevo pago|otro pago/i);
    expect(JSON.stringify(logs.mock.calls)).toContain('internal_error');
    expect(JSON.stringify(logs.mock.calls)).not.toContain('test-checkout-token');
  });
});
