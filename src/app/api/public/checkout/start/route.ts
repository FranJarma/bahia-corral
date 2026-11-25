import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { getDefaultTenantId } from '@/infrastructure/db/get-tenant';
import { CHECKOUT_COOKIE, checkoutCookieOptions } from '@/infrastructure/http/checkout-cookie';
import {
  assertTrustedOrigin,
  failResponse,
  jsonInput,
  successJson,
} from '@/infrastructure/http/route';
import { getCheckoutSession } from '@/modules/availability/application/checkout-session';
import { startCheckout } from '@/modules/availability/application/holds';

const input = z.object({
  unitId: z.string().uuid(),
  checkin: z.string(),
  checkout: z.string(),
  adults: z.number().int().min(1).max(20),
  childAges: z.array(z.number().int().min(0).max(17)).max(20),
});
export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    const data = await jsonInput(request, input);
    const tenantId = await getDefaultTenantId();
    const ctx = { tenantId, actorId: 'public-checkout', actorType: 'SYSTEM' as const };
    const current = await getCheckoutSession(ctx, request.cookies.get(CHECKOUT_COOKIE)?.value);
    if (current) return successJson({ ...current, resumed: true });
    const result = await startCheckout(
      { tenantId, actorId: 'public-checkout', actorType: 'SYSTEM' },
      data,
    );
    const response = successJson(result, 201);
    response.cookies.set(CHECKOUT_COOKIE, result.checkoutToken, checkoutCookieOptions);
    return response;
  } catch (error) {
    return failResponse(error);
  }
}
