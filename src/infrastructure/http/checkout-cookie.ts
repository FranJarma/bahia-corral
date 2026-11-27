export const CHECKOUT_COOKIE = 'bahia_checkout';
export const checkoutCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/public/checkout',
  maxAge: 24 * 3600,
};
