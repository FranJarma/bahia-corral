import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { LoginForm } from '@/modules/identity-access/ui/login-form';

export const metadata: Metadata = { title:'Acceso al equipo · Bahía Corral' };
export default function AdminLoginPage(){return <main className="flex min-h-dvh items-center justify-center bg-cream px-6 py-12"><div className="w-full max-w-[470px] rounded-2xl border border-[#e5d7c6] bg-cream-soft p-7 shadow-sm md:p-10"><Link href="/" className="mb-8 flex justify-center" aria-label="Volver a Bahía Corral"><Image src="/images/logo-bahia-corral.png" alt="Bahía Corral" width={138} height={116} className="h-auto w-[138px]" priority/></Link><h1 className="editorial text-center text-[36px]">Acceso administrativo</h1><p className="mb-7 mt-2 text-center text-sm text-muted">Ingresá con tu cuenta del equipo de Bahía Corral.</p><LoginForm/><p className="mt-7 text-center text-[11px] leading-6 text-muted">Las cuentas son personales. Si compartís la computadora, cerrá la sesión al finalizar tu turno.</p></div></main>}
