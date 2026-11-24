import { Clock3 } from 'lucide-react';
import Link from 'next/link';

import { PublicPage } from '@/modules/shared-ui/public-page';

export const dynamic = 'force-dynamic';
export default function PaymentResultPage(){return <PublicPage><section className="public-container flex min-h-[650px] items-center justify-center py-16"><div className="w-full max-w-[690px] rounded-2xl border border-[#e5d9c9] bg-cream-soft px-7 py-12 text-center md:px-14"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e8edf0]"><Clock3 size={29}/></div><p className="public-kicker mt-6">Estado del pago</p><h1 className="editorial mt-4 text-[37px] leading-tight md:text-[47px]">Estamos verificando tu pago</h1><p className="mx-auto mt-5 max-w-[520px] text-sm leading-7 text-muted">La redirección desde Mercado Pago no confirma por sí sola tu reserva. Te enviaremos la confirmación cuando el sistema compruebe el cobro y la disponibilidad.</p><div className="mt-9 flex flex-wrap justify-center gap-3"><Link className="primary-button" href="/mis-reservas">Ir a mis reservas</Link><Link className="secondary-button" href="/">Volver al inicio</Link></div></div></section></PublicPage>}
