import Link from 'next/link';

import { InvitationForm } from '@/modules/identity-access/ui/invitation-form';

export default async function AcceptInvitationPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token;
  if (!token || token.length < 32) {
    return <main className="public-container py-20"><h1 className="editorial text-3xl">Invitación inválida</h1><p className="mt-5 text-muted">Solicitá una nueva invitación a la administración.</p><Link className="primary-button mt-8" href="/admin/login">Ir al acceso</Link></main>;
  }
  return <main className="public-container py-16"><InvitationForm token={token} /></main>;
}
