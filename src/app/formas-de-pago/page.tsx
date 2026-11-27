import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { PublicPage } from '@/modules/shared-ui/public-page';

export const metadata: Metadata = {
  title: 'Formas de pago',
  description: 'Conocé cómo funciona la seña y el saldo de una reserva en Bahía Corral.',
};
export default function PaymentMethodsPage() {
  return (
    <PublicPage>
      <section className="public-container max-w-[1080px] py-14 md:py-20">
        <nav aria-label="Migas de pan" className="public-breadcrumb">
          <Link href="/">Inicio</Link>
          <span>/</span>
          <span aria-current="page">Formas de pago</span>
        </nav>
        <h1 className="editorial mt-10 text-[40px] md:text-[52px]">Tu reserva, tus pagos claros</h1>
        <p className="mt-3 text-sm text-muted">
          Podés reservar con una seña del 50% o abonar la estadía completa.
        </p>
        <h2 className="editorial mt-12 text-[27px]">Pagás de forma segura con Mercado Pago</h2>
        <p className="mt-5 text-xs leading-6 text-muted">
          Al continuar, salís de Bahía Corral para realizar el pago en Mercado Pago. Al volver, te
          mostramos si el pago fue aprobado, está pendiente o no pudo completarse.
        </p>
        <div className="mt-10 border-t border-[#dfd6ca] text-xs">
          <div className="grid gap-4 border-b border-[#e9e1d6] py-4 text-muted">
            <div className="flex justify-between">
              <span>Estadía · 1 noche</span>
              <span>$140.000</span>
            </div>
            <div className="flex justify-between">
              <span>Menor sin cargo</span>
              <span>$0</span>
            </div>
          </div>
          <div className="grid gap-4 pt-5 font-semibold">
            <div className="flex justify-between">
              <span>Total estadía</span>
              <span>$140.000</span>
            </div>
            <div className="flex justify-between">
              <span>Pagás ahora (seña 50%)</span>
              <span>$70.000</span>
            </div>
            <div className="flex justify-between font-normal text-muted">
              <span>Saldo pendiente</span>
              <span>$70.000</span>
            </div>
          </div>
        </div>
        <p className="mt-8 text-xs text-muted">
          Ejemplo ilustrativo según la cabaña seleccionada. El importe final se calcula y valida
          antes de pagar.
        </p>
        <h2 className="editorial mt-12 text-[27px]">Saldo pendiente</h2>
        <p className="mt-5 text-xs leading-7 text-muted">
          La fecha de vencimiento del saldo depende de las condiciones de tu reserva: puede abonarse
          al ingresar o antes del check-in. Los importes abonados y pendientes se consultan desde el
          detalle de reserva.
        </p>
        <p className="mt-7 text-xs leading-7 text-muted">
          Las cancelaciones están sujetas a las condiciones informadas al reservar. Para solicitar
          una devolución, consultá los términos y condiciones.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/contacto" className="secondary-button">
            Consultar formas de pago
          </Link>
          <Link href="/reservar" className="primary-button">
            Reservar ahora <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </PublicPage>
  );
}
