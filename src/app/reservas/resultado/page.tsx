import Link from 'next/link';

import { SiteHeader } from '@/modules/accommodations/ui/site-header';
export const dynamic = 'force-dynamic';
export default function PaymentResultPage() {
  return (
    <>
      <SiteHeader />
      <main className="public-container py-20">
        <div className="surface-card mx-auto max-w-xl p-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand">
            Estado del pago
          </p>
          <h1 className="editorial mt-3 text-4xl">Estamos verificando tu pago</h1>
          <p className="mt-5 leading-relaxed text-muted">
            La redirección de Mercado Pago no confirma por sí sola la reserva. Te enviaremos la
            confirmación cuando el sistema verifique el cobro y la disponibilidad.
          </p>
          <Link href="/mis-reservas" className="primary-button mt-8">
            Consultar mi reserva
          </Link>
        </div>
      </main>
    </>
  );
}
