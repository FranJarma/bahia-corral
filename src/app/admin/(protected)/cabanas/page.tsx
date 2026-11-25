import { PageHeading } from '@/modules/admin/ui/page-heading';
import { AccommodationManager } from '@/modules/admin/ui/accommodation-manager';
import { listAdminUnits } from '@/modules/accommodations/application/manage-units';
import { requireAdminActor } from '@/modules/identity-access/application/admin-actor';
import { hasPermission } from '@/modules/identity-access/domain/permissions';
export default async function Page() {
  const actor=await requireAdminActor();
  const initial=await listAdminUnits(actor);
  return <><PageHeading title="Gestión de alojamientos" subtitle="Administrá los alojamientos, sus fotos, capacidades y tarifas."/><AccommodationManager initial={initial} canManage={hasPermission(actor.role,'accommodations:write')}/></>;
}
