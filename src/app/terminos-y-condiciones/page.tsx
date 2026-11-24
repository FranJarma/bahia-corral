import type { Metadata } from 'next';
import Link from 'next/link';

import { PublicPage } from '@/modules/shared-ui/public-page';

export const metadata: Metadata = { title: 'Términos y condiciones de reserva' };
export default function TermsPage() {
  return <PublicPage><section className="public-container max-w-[850px] py-16 md:py-24"><h1 className="editorial text-[40px] md:text-[50px]">Términos y condiciones</h1><p className="mt-5 text-sm leading-7 text-muted">Información general de las estadías en Bahía Corral. Las condiciones particulares se presentan nuevamente antes de pagar.</p>
    <div className="mt-10 grid gap-8 text-sm leading-7"><section><h2 className="editorial text-[26px]">Horarios</h2><p className="mt-3 text-muted">Ingreso desde las 15:00, salida hasta las 10:00. Desayuno de 08:00 a 10:00.</p></section><section><h2 className="editorial text-[26px]">Seña y confirmación</h2><p className="mt-3 text-muted">La reserva web se confirma al verificarse el pago requerido y conservarse la disponibilidad de la unidad. La seña habitual es del 50% del total.</p></section><section><h2 className="editorial text-[26px]">Menores</h2><p className="mt-3 text-muted">Los menores de 4 años no abonan alojamiento, pero todos los huéspedes cuentan para la capacidad de la unidad.</p></section><section><h2 className="editorial text-[26px]">Cancelaciones</h2><p className="mt-3 text-muted">Las solicitudes de cancelación se revisan según la anticipación y las condiciones vigentes de la estadía. Para conocer cómo aplica una devolución en tu caso, comunicate con el complejo.</p></section></div>
    <div className="mt-10 flex flex-wrap gap-3"><Link href="/contacto" className="secondary-button">Consultar condiciones</Link><Link href="/arrepentimiento" className="secondary-button">Solicitar arrepentimiento</Link></div>
  </section></PublicPage>;
}
