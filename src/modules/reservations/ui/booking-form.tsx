'use client';

import {useEffect,useMemo,useState} from 'react';

import {PUBLIC_UNITS} from '@/modules/accommodations/domain/seed-units';

type Step='DATES'|'CONTACT'|'PAYMENT';
type Hold={holdId:string;quoteId:string;expiresAt:string;totalCents:string;depositCents:string;checkoutToken:string};
type ApiError={error?:string};
async function post<T>(path:string,body:unknown):Promise<T>{
  const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
  const json=await response.json() as T & ApiError;
  if(!response.ok)throw new Error(json.error||'No pudimos completar la operación.');
  return json;
}
export function BookingForm({defaultSlug}:{defaultSlug?:string}){
  const [slug,setSlug]=useState(defaultSlug??PUBLIC_UNITS[0].slug);
  const [unitId,setUnitId]=useState('');
  const [checkin,setCheckin]=useState('');const [checkout,setCheckout]=useState('');
  const [adults,setAdults]=useState(2);const [children,setChildren]=useState<number[]>([]);
  const [step,setStep]=useState<Step>('DATES');const [hold,setHold]=useState<Hold|null>(null);
  const [firstName,setFirstName]=useState('');const [lastName,setLastName]=useState('');const [email,setEmail]=useState('');const [phone,setPhone]=useState('');
  const [reservationId,setReservationId]=useState('');const [purpose,setPurpose]=useState<'DEPOSIT'|'FULL'>('DEPOSIT');
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [clock,setClock]=useState(Date.now());
  const unit=useMemo(()=>PUBLIC_UNITS.find(u=>u.slug===slug),[slug]);
  useEffect(()=>{queueMicrotask(()=>{setUnitId('');fetch(`/api/public/units?slug=${encodeURIComponent(slug)}`,{cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error('Servicio de reservas no configurado');const value=await r.json() as {unit:{id:string}};setUnitId(value.unit.id);}).catch(()=>setError('La consulta de disponibilidad requiere la conexión con el sistema de reservas.'));});},[slug]);
  useEffect(()=>{if(!hold)return;const id=window.setInterval(()=>setClock(Date.now()),1000);return()=>window.clearInterval(id);},[hold]);
  const seconds=hold?Math.max(0,Math.floor((new Date(hold.expiresAt).valueOf()-clock)/1000)):0;
  const expired=Boolean(hold&&seconds===0&&step==='CONTACT');
  const formatCents=(value:string)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2}).format(Number(BigInt(value))/100);
  async function begin(){setError('');setBusy(true);try{if(!unitId)throw new Error('Alojamiento no disponible');
    const next=await post<Hold>('/api/public/checkout/start',{unitId,checkin,checkout,adults,childAges:children});
    setHold(next);setClock(Date.now());setStep('CONTACT');
  }catch(e){setError(e instanceof Error?e.message:'Error de reserva');}finally{setBusy(false);}}
  async function continuePayment(){if(!hold||expired)return;setBusy(true);setError('');try{
    const result=await post<{reservationId:string}>('/api/public/checkout/guest',{holdId:hold.holdId,checkoutToken:hold.checkoutToken,contact:{firstName,lastName,email,phone}});
    setReservationId(result.reservationId);setStep('PAYMENT');
  }catch(e){setError(e instanceof Error?e.message:'Error de reserva');}finally{setBusy(false);}}
  async function checkout(){setBusy(true);setError('');try{
    const result=await post<{checkoutUrl:string}>('/api/public/checkout/pay',{reservationId,purpose,checkoutToken:hold?.checkoutToken});
    if(!result.checkoutUrl.startsWith('https://'))throw new Error('URL de pago inválida');
    window.location.assign(result.checkoutUrl);
  }catch(e){setError(e instanceof Error?e.message:'Error al iniciar el pago');}finally{setBusy(false);}}
  return <div className="surface-card p-6 md:p-9">
    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand">Reservá tu estadía</p>
    <h1 className="editorial mb-6 text-3xl md:text-4xl">{step==='DATES'?'Elegí fechas y huéspedes':step==='CONTACT'?'Tus datos de contacto':'Elegí cómo pagar'}</h1>
    {hold&&<div className="mb-6 rounded-xl bg-[#eff4ed] p-4"><p className="font-semibold">Cotización protegida: {formatCents(hold.totalCents)}</p><p className="mt-1 text-sm">Seña requerida: {formatCents(hold.depositCents)}</p><p className="mt-2 text-sm text-muted" aria-live="polite">{seconds>0?`Tenés ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} para continuar.`:'Finalizó el plazo del checkout. Si ya pagaste, verificaremos el resultado.'}</p></div>}
    {error&&<p role="alert" className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-900">{error}</p>}
    {step==='DATES'&&<form className="grid gap-5" onSubmit={e=>{e.preventDefault();void begin();}}>
      <label className="grid gap-2 text-sm font-semibold">Alojamiento<select value={slug} onChange={e=>setSlug(e.target.value)}>{PUBLIC_UNITS.map(u=><option value={u.slug} key={u.slug}>{u.name} · hasta {u.capacityTotal} personas</option>)}</select></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Ingreso<input required type="date" value={checkin} onChange={e=>setCheckin(e.target.value)}/></label><label className="grid gap-2 text-sm font-semibold">Salida<input required type="date" min={checkin} value={checkout} onChange={e=>setCheckout(e.target.value)}/></label></div>
      <label className="grid gap-2 text-sm font-semibold">Adultos<select value={adults} onChange={e=>setAdults(Number(e.target.value))}>{Array.from({length:unit?.capacityTotal??8},(_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-semibold">Cantidad de menores<select value={children.length} onChange={e=>setChildren(Array(Number(e.target.value)).fill(0))}>{Array.from({length:Math.max(0,(unit?.capacityTotal??8)-adults)+1},(_,i)=><option key={i} value={i}>{i}</option>)}</select></label>
      {children.map((age,i)=><label key={i} className="grid gap-2 text-sm font-semibold">Edad del menor {i+1}<select value={age} onChange={e=>setChildren(old=>old.map((a,index)=>index===i?Number(e.target.value):a))}>{Array.from({length:18},(_,a)=><option key={a} value={a}>{a} años</option>)}</select></label>)}
      <p className="text-sm text-muted">Los menores de 4 años no pagan alojamiento, pero cuentan para la capacidad total.</p>
      <button type="submit" className="primary-button w-full" disabled={busy||!unitId}>{busy?'Consultando…':'Continuar con la reserva'}</button>
    </form>}
    {step==='CONTACT'&&<form className="grid gap-4" onSubmit={e=>{e.preventDefault();void continuePayment();}}>
      <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Nombre<input required value={firstName} onChange={e=>setFirstName(e.target.value)}/></label><label className="grid gap-2 text-sm font-semibold">Apellido<input required value={lastName} onChange={e=>setLastName(e.target.value)}/></label></div>
      <label className="grid gap-2 text-sm font-semibold">Correo electrónico<input required type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label className="grid gap-2 text-sm font-semibold">Teléfono<input required type="tel" value={phone} onChange={e=>setPhone(e.target.value)}/></label>
      <p className="text-xs leading-relaxed text-muted">Al continuar, aceptás los términos de alojamiento y la política de cancelaciones informados por el complejo.</p>
      <button type="submit" className="primary-button w-full" disabled={busy||expired}>{busy?'Guardando…':'Revisar pago'}</button>
    </form>}
    {step==='PAYMENT'&&<div className="grid gap-5"><p className="text-sm text-muted">El pago se realizará de forma segura en Mercado Pago. La reserva sólo se confirma al verificar la seña o el importe total.</p>
      <fieldset className="grid gap-3"><legend className="mb-3 font-semibold">Forma de pago</legend>
        <label className="flex items-center gap-3 rounded-xl border p-4"><input type="radio" name="payment" checked={purpose==='DEPOSIT'} onChange={()=>setPurpose('DEPOSIT')}/>Pagar seña — {formatCents(hold?.depositCents??'0')}</label>
        <label className="flex items-center gap-3 rounded-xl border p-4"><input type="radio" name="payment" checked={purpose==='FULL'} onChange={()=>setPurpose('FULL')}/>Pagar el total — {formatCents(hold?.totalCents??'0')}</label>
      </fieldset><button className="primary-button" onClick={()=>void checkout()} disabled={busy}>{busy?'Conectando…':'Pagar con Mercado Pago'}</button>
    </div>}
  </div>;
}
