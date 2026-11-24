import type { Metadata } from 'next';
import Link from 'next/link';

import { LoginForm } from '@/modules/identity-access/ui/login-form';
export const metadata: Metadata = { title: 'Acceso administrativo' };
export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f0ede3] px-4 py-12">
      <div className="surface-card w-full max-w-[440px] p-9">
        <Link href="/" className="editorial text-3xl font-bold">
          Bahía Corral
        </Link>
        <p className="mt-3 text-sm text-muted">Acceso exclusivo al equipo del complejo.</p>
        <h1 className="editorial mt-9 text-3xl">Ingresar</h1>
        <LoginForm />
        <p className="mt-6 text-xs leading-relaxed text-muted">
          Utilizá tu cuenta personal. Si compartís la computadora, cerrá la sesión al terminar tu
          turno.
        </p>
      </div>
    </main>
  );
}
