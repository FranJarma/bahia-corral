import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { getDefaultTenantId } from '@/infrastructure/db/get-tenant';
import {
  assertTrustedOrigin,
  failResponse,
  jsonInput,
  successJson,
} from '@/infrastructure/http/route';
import { createPaymentRequest } from '@/modules/payments/application/create-payment-request';

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
    return failResponse(error);
  }
}
