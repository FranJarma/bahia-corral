import type { HoldStatus } from './holds';
export type CheckoutSession = {
  holdId: string;
  quoteId: string;
  checkoutToken: string;
  expiresAt: string;
  totalCents: string;
  depositCents: string;
  status: Extract<HoldStatus, 'ACTIVE' | 'VERIFYING' | 'UNCERTAIN'>;
  unitId: string;
  slug: string;
  checkin: string;
  checkout: string;
  adults: number;
  childAges: number[];
  reservationId: string | null;
  reference: string | null;
  contact: { firstName: string; lastName: string; email: string; phone: string } | null;
};
