import {PageHeading} from '@/modules/admin/ui/page-heading';
import {ReceptionScreen} from '@/modules/admin/ui/reception-screen';
import {requireAdminActor} from '@/modules/identity-access/application/admin-actor';
import {requirePermission} from '@/modules/identity-access/domain/permissions';
export default async function ReceptionPage(){const actor=await requireAdminActor();requirePermission(actor.role,'reservations:read');return <><PageHeading title="Pantalla de recepción" subtitle="Estado operativo actualizado de los seis alojamientos"/><ReceptionScreen/></>}
