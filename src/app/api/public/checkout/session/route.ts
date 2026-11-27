import type { NextRequest } from 'next/server';

import { getDefaultTenantId } from '@/infrastructure/db/get-tenant';
import { CHECKOUT_COOKIE, checkoutCookieOptions } from '@/infrastructure/http/checkout-cookie';
import { failResponse, successJson } from '@/infrastructure/http/route';
import { getCheckoutSession } from '@/modules/availability/application/checkout-session';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getDefaultTenantId();
    const checkout = await getCheckoutSession(
      { tenantId, actorId: 'public-checkout', actorType: 'SYSTEM' },
      request.cookies.get(CHECKOUT_COOKIE)?.value,
    );
    const response = successJson({ checkout });
    if (!checkout)
      response.cookies.set(CHECKOUT_COOKIE, '', { ...checkoutCookieOptions, maxAge: 0 });
    return response;
  } catch (error) {
    return failResponse(error);
  }
}
