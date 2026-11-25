import { PageHeading } from '@/modules/admin/ui/page-heading';
import { GuestManager } from '@/modules/admin/ui/contact-managers';
import { listAdminGuests } from '@/modules/guests/application/manage-guests';
import { requireAdminActor } from '@/modules/identity-access/application/admin-actor';
import { hasPermission } from '@/modules/identity-access/domain/permissions';
export default async function Page() {
  const actor=await requireAdminActor();
  const initial=await listAdminGuests(actor);
  return <><PageHeading title="Gestión de huéspedes" subtitle="Administrá los datos de contacto de los huéspedes registrados."/><GuestManager initial={initial} canEdit={hasPermission(actor.role,'reservations:write')}/></>;
}
