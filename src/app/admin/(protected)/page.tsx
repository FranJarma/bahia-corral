import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { OccupancyWeek } from '@/modules/admin/ui/occupancy-week';
import { PageHeading } from '@/modules/admin/ui/page-heading';
import { requireAdminActor } from '@/modules/identity-access/application/admin-actor';
import { listReservations } from '@/modules/reservations/application/list-reservations';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const actor=await requireAdminActor();
  if(actor.role==='CLEANING') return <div><PageHeading title="Tu jornada de limpieza" subtitle="Actualizá las unidades asignadas desde el módulo de limpieza"/><Link className="primary-button" href="/admin/limpieza">Ir a limpieza <ArrowRight size={16}/></Link></div>;
  const reservations=await listReservations({tenantId:actor.tenantId,actorId:actor.userId,actorType:'USER'});
  const today=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'America/Argentina/Buenos_Aires'}).format(new Date());
  const occupied=reservations.filter(r=>r.checkin<=today&&r.checkout>today&&['CONFIRMED','IN_STAY'].includes(r.status));
  const arrival=reservations.filter(r=>r.checkin===today&&['CONFIRMED','IN_STAY'].includes(r.status));
  const departure=reservations.filter(r=>r.checkout===today&&['CONFIRMED','IN_STAY','FINISHED'].includes(r.status));
  const stats=[
    {label:'Ocupación de hoy',value:`${Math.round(occupied.length/6*100)}%`,description:`${occupied.length} de 6 alojamientos ocupados`},
    {label:'Llegadas de hoy',value:arrival.length,description:'Reservas con llegada hoy'},
    {label:'Salidas de hoy',value:departure.length,description:'Reservas con salida hoy'},
    {label:'Alojamientos disponibles',value:Math.max(0,6-occupied.length),description:'Disponibles para ingresar hoy'},
  ];
  return <>
    <PageHeading title="Un vistazo a tu día" subtitle="La operación de Bahía Corral, en un solo lugar." action={<div className="flex flex-wrap gap-3"><Link href="/admin/reservas/nueva" className="primary-button">Nueva reserva <ArrowRight size={15}/></Link><Link href="/admin/reservas" className="secondary-button">Ver reservas</Link></div>}/>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(stat=><article key={stat.label} className="min-h-[104px] rounded-xl border border-[#a9afb0] bg-cream-soft p-4"><p className="text-[10px] text-[#5f6b6f]">{stat.label}</p><p className="editorial mt-1 text-[30px] leading-none">{stat.value}</p><p className="mt-2 text-[10px] text-muted">{stat.description}</p></article>)}</div>
    <OccupancyWeek reservations={reservations}/>
  </>;
}
