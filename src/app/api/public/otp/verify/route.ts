import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { CHECKOUT_COOKIE, checkoutCookieOptions } from '@/infrastructure/http/checkout-cookie';
import { assertTrustedOrigin, failResponse, jsonInput } from '@/infrastructure/http/route';
import {
  recoverPendingCheckout,
  verifyReservationOtp,
} from '@/modules/guests/application/reservation-otp';

const input = z.object({
  reference: z.string(),
  email: z.email(),
  code: z.string().regex(/^\d{6}$/),
});
export async function POST(request: NextRequest) {
  try {
    assertTrustedOrigin(request);
    const data = await jsonInput(request, input);
    const grant = await verifyReservationOtp(data.reference, data.email, data.code);
    if (!grant) return NextResponse.json({ error: 'Código inválido o vencido' }, { status: 401 });
    const checkoutToken = await recoverPendingCheckout(data.reference, grant);
    const response = NextResponse.json(
      { verified: true, reference: data.reference, resumeCheckout: Boolean(checkoutToken) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    if (checkoutToken) response.cookies.set(CHECKOUT_COOKIE, checkoutToken, checkoutCookieOptions);
    response.cookies.set('bahia_guest_access', grant, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/mis-reservas',
      maxAge: 24 * 3600,
    });
    return response;
  } catch (error) {
    return failResponse(error);
  }
}
