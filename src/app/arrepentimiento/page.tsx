import type { Metadata } from 'next';

import { PublicPage } from '@/modules/shared-ui/public-page';

export const metadata: Metadata = { title: 'Solicitud de arrepentimiento' };
export default function WithdrawalPage() {
  return <PublicPage><section className="public-container max-w-[800px] py-16 md:py-24"><h1 className="editorial text-[40px] md:text-[50px]">Botón de arrepentimiento</h1><p className="mt-5 max-w-2xl text-sm leading-7 text-muted">Podés solicitar la revisión de tu contratación mediante el siguiente canal. Incluí tu referencia de reserva y un medio de contacto. La solicitud no cancela una reserva de forma automática.</p><a className="primary-button mt-8" href="mailto:reservas@bahiacorral.com?subject=Solicitud%20de%20arrepentimiento%20-%20Bah%C3%ADa%20Corral">Enviar solicitud por email</a><p className="mt-5 text-xs text-muted">El envío se realiza desde tu aplicación de correo. Conservá una copia de tu solicitud.</p></section></PublicPage>;
}
