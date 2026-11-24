import { CalendarDays, CreditCard, MapPin, Users } from 'lucide-react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';

import { PUBLIC_UNITS } from '@/modules/accommodations/domain/seed-units';
import { getGuestReservation } from '@/modules/guests/application/reservation-otp';
import { OtpAccess } from '@/modules/guests/ui/otp-access';
import { PublicPage } from '@/modules/shared-ui/public-page';

export const metadata: Metadata = { title: 'Mis reservas' };
export const dynamic = 'force-dynamic';
function money(cents: string) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(BigInt(cents)) / 100);
}
export default async function MyReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ referencia?: string }>;
}) {
  const reference = (await searchParams).referencia ?? '';
  const token = (await cookies()).get('bahia_guest_access')?.value;
  const reservation = token && reference ? await getGuestReservation(reference, token) : null;
  const unit = PUBLIC_UNITS.find((u) => u.name === reservation?.unit_name);
  return (
    <PublicPage>
      <section className="public-container min-h-[620px] py-12 md:py-20">
        <nav className="public-breadcrumb mb-9" aria-label="Migas de pan">
          <Link href="/">Inicio</Link>
          <span>/</span>
          <strong className="text-ink">Mis reservas</strong>
        </nav>
        <header className="mb-8">
          <h1 className="editorial text-[38px] md:text-[50px]">Mis reservas</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            Consultá la información de tu estadía de manera segura, sin necesidad de crear una
            cuenta.
          </p>
        </header>
        {reservation ? (
          <article className="grid gap-7 rounded-2xl border border-[#e1d5c5] bg-cream-soft p-5 md:grid-cols-[220px_1fr] md:p-7">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
              <Image
                src={`/images/${unit?.slug ?? 'cabana-1'}.jpg`}
                alt={`Alojamiento ${reservation.unit_name} en Bahía Corral`}
                fill
                sizes="220px"
                className="object-cover"
              />
            </div>
            <div>
              <p className="public-kicker">Reserva {reservation.reference}</p>
              <h2 className="editorial mt-2 text-[27px]">{reservation.unit_name}</h2>
              <div className="mt-5 grid gap-3 text-xs text-muted md:grid-cols-2">
                <p className="flex items-center gap-2">
                  <CalendarDays size={17} />
                  Llegada: {reservation.checkin}
                </p>
                <p className="flex items-center gap-2">
                  <CalendarDays size={17} />
                  Salida: {reservation.checkout}
                </p>
                <p className="flex items-center gap-2">
                  <Users size={17} />
                  Estado: {reservation.status}
                </p>
                <p className="flex items-center gap-2">
                  <CreditCard size={17} />
                  Pagos recibidos: {money(reservation.paid_cents)}
                </p>
              </div>
              <Link href="/contacto" className="secondary-button mt-6">
                Consultar por esta reserva
              </Link>
            </div>
          </article>
        ) : (
          <div className="grid items-start gap-9 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.8fr)]">
            <OtpAccess />
            <aside className="rounded-2xl bg-[#f0e8db] p-7">
              <MapPin size={27} strokeWidth={1.5} />
              <h2 className="editorial mt-5 text-[26px]">Tu descanso comienza acá</h2>
              <p className="mt-4 text-sm leading-7 text-muted">
                Revisá tu reserva y el estado del pago con tu referencia y el correo utilizado al
                reservar.
              </p>
              <Link href="/alojamientos" className="secondary-button mt-7">
                Ver alojamientos
              </Link>
            </aside>
          </div>
        )}
      </section>
    </PublicPage>
  );
}
