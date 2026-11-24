import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { SiteHeader } from '@/modules/accommodations/ui/site-header';
import { getGuestReservation } from '@/modules/guests/application/reservation-otp';
import { OtpAccess } from '@/modules/guests/ui/otp-access';
export const metadata: Metadata = { title: 'Mis reservas' };
export const dynamic = 'force-dynamic';
export default async function MyReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ referencia?: string }>;
}) {
  const reference = (await searchParams).referencia ?? '';
  const token = (await cookies()).get('bahia_guest_access')?.value;
  const reservation = token && reference ? await getGuestReservation(reference, token) : null;
  return (
    <>
      <SiteHeader />
      <main className="public-container py-16">
        <h1 className="editorial text-5xl">Mis reservas</h1>
        <p className="my-6 max-w-xl text-muted">
          Consultá la información de tu estadía de manera segura, sin necesidad de crear una cuenta.
        </p>
        <div className="max-w-xl">
          {reservation ? (
            <div className="surface-card grid gap-4 p-7">
              <h2 className="font-semibold">Reserva {reservation.reference}</h2>
              <p>
                {reservation.unit_name} · {reservation.checkin} al {reservation.checkout}
              </p>
              <p>Estado: {reservation.status}</p>
              <p>Pagos recibidos: {reservation.paid_cents} centavos ARS</p>
            </div>
          ) : (
            <OtpAccess />
          )}
        </div>
      </main>
    </>
  );
}
