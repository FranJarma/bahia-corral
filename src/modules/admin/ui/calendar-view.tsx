'use client';
import {useEffect,useState} from 'react';
type Entry={id:string;unit_name:string;checkin:string;checkout:string;reason:string;guest_name:string|null;status:string|null};
function localDate(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function CalendarView(){
  const [month,setMonth]=useState(()=>new Date());const [entries,setEntries]=useState<Entry[]>([]);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  useEffect(()=>{const from=localDate(new Date(month.getFullYear(),month.getMonth(),1));const to=localDate(new Date(month.getFullYear(),month.getMonth()+1,1));
    fetch(`/api/admin/calendar?from=${from}&to=${to}`).then(async r=>{if(!r.ok)throw new Error('No se pudo cargar el calendario');return r.json();}).then((data:{entries:Entry[]})=>setEntries(data.entries)).catch(e=>setError(e instanceof Error?e.message:'Error')).finally(()=>setBusy(false));
  },[month]);
  const move=(n:number)=>setMonth(value=>new Date(value.getFullYear(),value.getMonth()+n,1));
  return <div className="surface-card p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="editorial text-2xl capitalize">{new Intl.DateTimeFormat('es-AR',{month:'long',year:'numeric'}).format(month)}</h2><div className="flex gap-2"><button className="secondary-button" onClick={()=>move(-1)}>Anterior</button><button className="secondary-button" onClick={()=>move(1)}>Siguiente</button></div></div>
    <p className="my-5 text-sm text-muted">Reservas y bloqueos del período. Una salida y un ingreso pueden coincidir el mismo día.</p>
    {error&&<p role="alert" className="text-red-700">{error}</p>}{busy&&<p className="py-8 text-muted">Actualizando calendario…</p>}
    <div className="grid gap-3">{entries.map(e=><div key={e.id} className="grid items-center gap-2 rounded-xl border border-[#e6e2d9] bg-[#f9f8f3] p-4 sm:grid-cols-[200px_1fr_auto]"><strong>{e.unit_name}</strong><span className="text-sm">{e.checkin} → {e.checkout}</span><span className="rounded-full bg-[#e1eee7] px-3 py-1 text-xs font-semibold">{e.guest_name??e.reason}</span></div>)}{!busy&&!entries.length&&<p className="py-8 text-center text-muted">No hay reservas ni bloqueos para este mes.</p>}</div></div>;
}
