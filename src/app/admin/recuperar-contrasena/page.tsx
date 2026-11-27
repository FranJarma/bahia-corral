import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { ForgotPasswordForm } from '@/modules/identity-access/ui/forgot-password-form';

export const metadata: Metadata = { title: 'Recuperar contraseña · Bahía Corral' };

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-cream px-6 py-12">
      <section className="w-full max-w-[470px] rounded-2xl border border-[#e5d7c6] bg-cream-soft p-7 shadow-sm md:p-10">
        <Link href="/" className="mb-8 flex justify-center" aria-label="Volver a Bahía Corral">
          <Image
            src="/images/logo-bahia-corral.png"
            width={138}
            height={116}
            alt="Bahía Corral"
            className="h-auto w-[138px]"
            priority
          />
        </Link>
        <h1 className="editorial text-center text-[34px]">Recuperar contraseña</h1>
        <p className="mt-2 text-center text-sm leading-6 text-muted">
          Ingresá el correo asociado a tu usuario administrativo. Te enviaremos un enlace seguro.
        </p>
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
