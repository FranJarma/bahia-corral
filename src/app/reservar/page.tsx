import type { Metadata } from 'next';

import { BookingForm } from '@/modules/reservations/ui/booking-form';
import { PublicPage } from '@/modules/shared-ui/public-page';

export const metadata: Metadata = { title: 'Completá tu reserva' };
export default async function ReservationPage({
  searchParams,
}: {
  searchParams: Promise<{
    alojamiento?: string;
    checkin?: string;
    checkout?: string;
    adults?: string;
    minors?: string;
  }>;
}) {
  const params = await searchParams;
  const adults = Math.max(1, Math.min(8, Number(params.adults) || 2));
  const minors = Math.max(0, Math.min(8 - adults, Number(params.minors) || 0));
  const checkin = /^\d{4}-\d{2}-\d{2}$/.test(params.checkin ?? '') ? params.checkin : '';
  const checkout = /^\d{4}-\d{2}-\d{2}$/.test(params.checkout ?? '') ? params.checkout : '';
  return (
    <PublicPage>
      <section className="public-container py-8 md:py-14">
        <BookingForm
          defaultSlug={params.alojamiento}
          defaultCheckin={checkin}
          defaultCheckout={checkout}
          defaultAdults={adults}
          defaultMinors={minors}
        />
      </section>
    </PublicPage>
  );
}
