import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { ResetPasswordForm } from '@/modules/identity-access/ui/reset-password-form';

export const metadata: Metadata = { title: 'Restablecer contraseña · Bahía Corral' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
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
        <h1 className="editorial text-center text-[34px]">Nueva contraseña</h1>
        {token && !error ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="mt-7 space-y-6 text-center">
            <p role="alert" className="text-sm leading-7 text-muted">
              El enlace no es válido o venció. Solicitá uno nuevo para recuperar tu cuenta.
            </p>
            <Link href="/admin/recuperar-contrasena" className="primary-button w-full">
              Solicitar nuevo enlace
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
