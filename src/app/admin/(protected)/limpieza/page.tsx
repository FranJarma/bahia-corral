import {PageHeading} from '@/modules/admin/ui/page-heading';
import {CleaningPanel} from '@/modules/admin/ui/cleaning-panel';
import {requireAdminActor} from '@/modules/identity-access/application/admin-actor';
import {requirePermission} from '@/modules/identity-access/domain/permissions';
export default async function CleaningPage(){const actor=await requireAdminActor();requirePermission(actor.role,'housekeeping:read');return <><PageHeading title="Control de limpieza" subtitle="Actualizá el estado de preparación de cada unidad"/><CleaningPanel/></>}
