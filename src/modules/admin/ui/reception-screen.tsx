'use client';
import {useEffect,useState} from 'react';
type Unit={unit_id:string;name:string;cleaning:string;guest_name:string|null;checkin:string|null;checkout:string|null;reservation_status:string|null};
export function ReceptionScreen(){
  const [units,setUnits]=useState<Unit[]>([]);const [updated,setUpdated]=useState('');const [error,setError]=useState('');
  async function refresh(){try{const r=await fetch('/api/admin/reception',{cache:'no-store'});if(!r.ok)throw new Error('No se pudo actualizar la pantalla');const d=await r.json() as {units:Unit[];lastUpdated:string};setUnits(d.units);setUpdated(d.lastUpdated);setError('');}catch(e){setError(e instanceof Error?e.message:'Error');}}
  useEffect(()=>{void refresh();const t=window.setInterval(()=>void refresh(),15_000);return()=>window.clearInterval(t);},[]);
  return <div><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted">Última actualización: {updated?new Date(updated).toLocaleTimeString('es-AR'):'Sin actualizar'} · cada 15 segundos</p><button className="secondary-button" onClick={()=>void refresh()}>Actualizar ahora</button></div>
    {error&&<p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-900">{error}</p>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{units.map(u=><article key={u.unit_id} className="surface-card p-6"><h2 className="editorial mb-4 text-2xl">{u.name}</h2><p className="text-sm font-semibold">{u.reservation_status==='IN_STAY'?'Ocupado':u.guest_name?'Ingreso programado':'Disponible'}</p><p className="mt-2 text-sm">Limpieza: <strong>{u.cleaning==='READY'?'Lista':u.cleaning==='PENDING'?'Pendiente':'En proceso'}</strong></p>{u.guest_name&&<p className="mt-3 text-sm text-muted">{u.guest_name} · {u.checkin} a {u.checkout}</p>}</article>)}</div>
  </div>;
}
