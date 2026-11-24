import { type NextRequest, NextResponse } from 'next/server';

import { getDefaultTenantId } from '@/infrastructure/db/get-tenant';
import { reconcileMercadoPagoOrder } from '@/modules/payments/application/reconcile-order';
import { verifyMercadoPagoWebhook } from '@/modules/payments/integrations/mercadopago';

export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  const id = request.nextUrl.searchParams.get('data.id');
  if (
    !id ||
    !secret ||
    !verifyMercadoPagoWebhook({
      dataId: id,
      secret,
      signature: request.headers.get('x-signature'),
      requestId: request.headers.get('x-request-id'),
    })
  )
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
  try {
    const tenantId = await getDefaultTenantId();
    const result = await reconcileMercadoPagoOrder(
      { tenantId, actorId: 'mercadopago', actorType: 'PROVIDER' },
      id,
    );
    return NextResponse.json({ received: true, result });
  } catch (error) {
    console.error('No se pudo conciliar la order autenticada', {
      orderId: id,
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
    // No responder 200 cuando el proveedor debe reintentar la notificación.
    return NextResponse.json({ error: 'Conciliación pendiente' }, { status: 503 });
  }
}
