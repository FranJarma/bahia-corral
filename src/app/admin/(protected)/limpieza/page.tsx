import { CleaningPanel } from '@/modules/admin/ui/cleaning-panel';
import { PageHeading } from '@/modules/admin/ui/page-heading';
import { requireAdminActor } from '@/modules/identity-access/application/admin-actor';
export default async function CleaningPage(){await requireAdminActor();return <><PageHeading title="Limpieza" subtitle="Priorizá los próximos ingresos. Finalizar una tarea permite identificar el alojamiento como listo."/><CleaningPanel/></>}
