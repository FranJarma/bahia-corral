import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteHeader } from '@/modules/accommodations/ui/site-header';
import { BookingForm } from '@/modules/reservations/ui/booking-form';
export const metadata: Metadata = { title: 'Reservar alojamiento' };
export default async function ReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ alojamiento?: string }>;
}) {
  const { alojamiento } = await searchParams;
  return (
    <>
      <SiteHeader />
      <main className="public-container py-14">
        <Link href="/alojamientos" className="text-sm text-brand underline">
          Volver a alojamientos
        </Link>
        <div className="mx-auto mt-8 max-w-2xl">
          <BookingForm defaultSlug={alojamiento} />
        </div>
      </main>
    </>
  );
}
