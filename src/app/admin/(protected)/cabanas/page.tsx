import { sql } from 'drizzle-orm';

import { resultRows, runTenantTx } from '@/infrastructure/db/tenant-transaction';
import { AdminRecordsTable } from '@/modules/admin/ui/admin-records-table';
import { PageHeading } from '@/modules/admin/ui/page-heading';
import { requireAdminActor } from '@/modules/identity-access/application/admin-actor';
import { requirePermission } from '@/modules/identity-access/domain/permissions';

export default async function AdminUnitsPage(){
  const actor=await requireAdminActor();requirePermission(actor.role,'reservations:read');
  const units=await runTenantTx({tenantId:actor.tenantId,actorId:actor.userId,actorType:'USER'},async tx=>resultRows<{id:string;name:string;type:string;capacity_total:number;published:boolean}>(await tx.execute(sql`SELECT id,name,type,capacity_total,published FROM accommodation_units WHERE tenant_id=${actor.tenantId} ORDER BY code`)));
  const rows=units.map(u=>({id:u.id,name:u.name,type:u.type==='CABIN'?'Cabaña familiar':u.type==='STUDIO'?'Monoambiente':'Habitación',capacity:`Hasta ${u.capacity_total} huéspedes`,status:u.published?'Publicada':'Sin publicar',detail:'/admin/tarifas'}));
  return <><PageHeading title="Gestión de alojamientos" subtitle="Administrá los seis alojamientos físicos, sus capacidades y tarifas."/><AdminRecordsTable rows={rows} columns={[{key:'name',label:'Alojamiento',weight:'bold'},{key:'type',label:'Tipo'},{key:'capacity',label:'Capacidad'},{key:'status',label:'Estado',badge:true}]} emptyMessage="No se encontraron alojamientos." searchPlaceholder="Buscar alojamiento" actionKey="detail" actionLabel="Consultar tarifas"/></>;
}
