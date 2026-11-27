import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getDefaultTenantId } from '@/infrastructure/db/get-tenant';
import {
  assertTrustedOrigin,
  failResponse,
  jsonInput,
  successJson,
} from '@/infrastructure/http/route';
import { createPaymentRequest } from '@/modules/payments/application/create-payment-request';
import {
  isDefiniteCheckoutRejection,
  MercadoPagoApiError,
} from '@/modules/payments/integrations/mercadopago';

const input = z.object({
  reservationId: z.string().uuid(),
  checkoutToken: z.string().min(32).max(128),
  purpose: z.enum(['DEPOSIT', 'FULL']),
});
export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    const data = await jsonInput(request, input);
    const tenantId = await getDefaultTenantId();
    return successJson(
      await createPaymentRequest(
        { tenantId, actorId: 'public-checkout', actorType: 'SYSTEM' },
        data,
      ),
      201,
    );
  } catch (error) {
    if (error instanceof MercadoPagoApiError) {
      console.error('No se pudo iniciar el checkout de Mercado Pago', {
        providerStatus: error.status,
        providerCode: error.code,
      });
      const rejected = isDefiniteCheckoutRejection(error);
      return NextResponse.json(
        {
          code: rejected ? 'PAYMENT_PROVIDER_UNAVAILABLE' : 'PAYMENT_STATUS_UNCERTAIN',
          error: rejected
            ? 'El pago online no está disponible en este momento. No se inició un cobro. Contactá al complejo para continuar con tu reserva.'
            : 'No pudimos verificar el inicio del pago. No inicies otro pago hasta que se resuelva la verificación. Contactá al complejo para consultar el estado.',
        },
        { status: rejected ? 503 : 502 },
      );
    }
    return failResponse(error);
  }
}
