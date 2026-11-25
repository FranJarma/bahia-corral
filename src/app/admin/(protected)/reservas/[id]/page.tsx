import { redirect } from 'next/navigation';

import { requireAdminActor } from '@/modules/identity-access/application/admin-actor';
import { requirePermission } from '@/modules/identity-access/domain/permissions';
export const dynamic = 'force-dynamic';
export default async function ReservationDetail({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdminActor();
  requirePermission(actor.role, 'reservations:read');
  redirect('/admin/reservas?reserva=' + encodeURIComponent((await params).id));
}
