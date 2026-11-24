'use client';
import {useEffect,useState} from 'react';

type Unit={id:string;name:string;capacity_total:number};
export function NewReservationForm(){
  const [units,setUnits]=useState<Unit[]>([]);const [unitId,setUnitId]=useState('');
  const [checkin,setCheckin]=useState('');const [checkout,setCheckout]=useState('');const [adults,setAdults]=useState(2);
  const [firstName,setFirstName]=useState('');const [lastName,setLastName]=useState('');const [phone,setPhone]=useState('');const [email,setEmail]=useState('');
  const [confirmWithoutDeposit,setConfirmWithoutDeposit]=useState(true);const [reason,setReason]=useState('Reserva recibida telefónicamente; pago pendiente');
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  useEffect(()=>{fetch('/api/admin/units').then(r=>r.json()).then((v:{units:Unit[]})=>{setUnits(v.units??[]);setUnitId(v.units?.[0]?.id??'');}).catch(()=>setMessage('No se pudieron cargar los alojamientos'));},[]);
  async function submit(){setBusy(true);setMessage('');try{
    const r=await fetch('/api/admin/reservations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({unitId,checkin,checkout,adults,childAges:[],contact:{firstName,lastName,phone,email:email||undefined},confirmWithoutDeposit,reason})});
    const d=await r.json() as {error?:string;reservationId?:string};if(!r.ok)throw new Error(d.error??'No se pudo crear la reserva');
    if(d.reservationId)window.location.assign(`/admin/reservas/${d.reservationId}`);
  }catch(err){setMessage(err instanceof Error?err.message:'No pudo crearse');}finally{setBusy(false);}}
  return <form className="surface-card mx-auto grid max-w-[780px] gap-5 p-7" onSubmit={e=>{e.preventDefault();void submit();}}>
    <label className="grid gap-2 text-sm font-semibold">Alojamiento<select required value={unitId} onChange={e=>setUnitId(e.target.value)}>{units.map(u=><option key={u.id} value={u.id}>{u.name} · {u.capacity_total} personas</option>)}</select></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Ingreso<input required type="date" value={checkin} onChange={e=>setCheckin(e.target.value)}/></label><label className="grid gap-2 text-sm font-semibold">Salida<input required min={checkin} type="date" value={checkout} onChange={e=>setCheckout(e.target.value)}/></label></div>
    <label className="grid gap-2 text-sm font-semibold">Adultos<input required type="number" min="1" max="8" value={adults} onChange={e=>setAdults(Number(e.target.value))}/></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Nombre<input required value={firstName} onChange={e=>setFirstName(e.target.value)}/></label><label className="grid gap-2 text-sm font-semibold">Apellido<input required value={lastName} onChange={e=>setLastName(e.target.value)}/></label></div>
    <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Teléfono<input required type="tel" value={phone} onChange={e=>setPhone(e.target.value)}/></label><label className="grid gap-2 text-sm font-semibold">Correo (opcional)<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label></div>
    <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={confirmWithoutDeposit} onChange={e=>setConfirmWithoutDeposit(e.target.checked)}/>Confirmar ahora sin cobrar seña</label>
    {confirmWithoutDeposit&&<label className="grid gap-2 text-sm font-semibold">Motivo de la excepción<textarea required rows={3} value={reason} onChange={e=>setReason(e.target.value)}/></label>}
    {message&&<p role="alert" className="text-sm text-red-700">{message}</p>}
    <button className="primary-button" disabled={busy||!unitId}>{busy?'Registrando…':'Crear reserva'}</button>
  </form>;
}
