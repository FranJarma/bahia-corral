'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AdminGuest } from '@/modules/guests/application/manage-guests';
import type { AdminInquiry } from '@/modules/event-inquiries/application/manage-inquiries';
import { AdminRecordsTable } from '@/modules/admin/ui/admin-records-table';
import { AdminDialog } from '@/modules/shared-ui/admin-dialog';
import { ValidatedLabel } from '@/modules/shared-ui/validated-label';

type RecordData={id:string;[key:string]:string};
type Field={key:string;label:string;type?:string;required?:boolean};
const guestFields:Field[]=[{key:'firstName',label:'Nombre',required:true},{key:'lastName',label:'Apellido',required:true},{key:'phone',label:'Teléfono',type:'tel',required:true},{key:'email',label:'Correo electrónico (opcional)',type:'email'}];
const eventFields:Field[]=[{key:'contactName',label:'Nombre de contacto',required:true},{key:'email',label:'Correo electrónico',type:'email',required:true},{key:'phone',label:'Teléfono',type:'tel',required:true},{key:'eventType',label:'Tipo de evento',required:true},{key:'preferredDate',label:'Fecha preferida (opcional)',type:'date'},{key:'guestsCount',label:'Cantidad de personas (opcional)',type:'number'}];
const statusLabels:Record<string,string>={NEW:'Nueva',CONTACTED:'Contactada',CLOSED:'Cerrada'};

function ContactManager({kind,records,canEdit=true}:{kind:'guests'|'events';records:RecordData[];canEdit?:boolean}) {
  const router=useRouter();
  const [editing,setEditing]=useState<string|null|undefined>(undefined);
  const [draft,setDraft]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const guests=kind==='guests', fields=guests?guestFields:eventFields;
  const createLabel=guests?'Nuevo huésped':'Nueva consulta de evento';
  const title=editing? (guests?'Editar huésped':'Editar consulta de evento'):createLabel;
  function edit(record?:RecordData) {
    setDraft(record??{status:'NEW',notes:''}); setError(''); setEditing(record?.id??null);
  }
  async function submit() {
    setBusy(true);setError('');
    try {
      const body:Record<string,unknown>={...draft};
      if(!guests)body.guestsCount=draft.guestsCount?Number(draft.guestsCount):null;
      const response=await fetch('/api/admin/'+kind,{method:editing?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const json=await response.json() as {error?:string};
      if(!response.ok)throw new Error(json.error??'No se pudieron guardar los datos.');
      setEditing(undefined);setMessage(guests?'Datos del huésped guardados.':'Consulta de evento guardada.');router.refresh();
    }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar.');}finally{setBusy(false);}
  }
  return <>
    {canEdit&&<div className="mb-4 flex justify-end"><button type="button" className="primary-button" onClick={()=>edit()}>{createLabel}</button></div>}
    {message&&<p role="status" className="mb-4 text-sm text-positive">{message}</p>}
    <AdminRecordsTable rows={records} columns={guests?[
      {key:'name',label:'Huésped',weight:'bold'},{key:'email',label:'Correo electrónico'},{key:'phone',label:'Teléfono'}
    ]:[{key:'contactName',label:'Contacto',weight:'bold'},{key:'eventType',label:'Tipo de evento'},{key:'preferredDate',label:'Fecha preferida'},{key:'statusLabel',label:'Estado',badge:true},{key:'notes',label:'Observaciones'}]}
      emptyMessage={guests?'Aún no hay huéspedes registrados.':'Todavía no hay consultas de eventos.'}
      searchPlaceholder={guests?'Buscar por nombre, correo o teléfono':'Buscar por contacto o tipo de evento'}
      actions={canEdit?row=><button type="button" className="min-h-11 whitespace-nowrap font-semibold hover:underline" aria-label={'Editar '+(guests?row.name:row.contactName)} onClick={()=>edit(row)} >Editar</button>:undefined} />
    <AdminDialog open={editing!==undefined} onOpenChange={open=>{if(!open&&!busy)setEditing(undefined);}} title={title}
      description={guests?'Guardá los datos de contacto del huésped.':'Registrá la consulta y su seguimiento. La consulta no bloquea alojamientos.'}>
      <form className="admin-form" onSubmit={e=>{e.preventDefault();void submit();}}>
        <div className="grid gap-4 sm:grid-cols-2">{fields.map(field=><ValidatedLabel key={field.key} className="public-form-label min-w-0">
          {field.label}<input type={field.type??'text'} required={field.required} min={field.type==='number'?1:undefined}
            minLength={field.type==='tel'?6:undefined} value={draft[field.key]??''} onChange={e=>setDraft(v=>({...v,[field.key]:e.target.value}))}/>
        </ValidatedLabel>)}</div>
        {!guests&&<>
          <label className="public-form-label">Estado<select value={draft.status??'NEW'} onChange={e=>setDraft(v=>({...v,status:e.target.value}))}>{Object.entries(statusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <label className="public-form-label">Observaciones<textarea rows={3} maxLength={3000} value={draft.notes??''} onChange={e=>setDraft(v=>({...v,notes:e.target.value}))}/></label>
        </>}
        {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="admin-form-actions"><button type="button" disabled={busy} className="secondary-button" onClick={()=>setEditing(undefined)}>Cancelar</button>
          <button className="primary-button" disabled={busy}>{busy?'Guardando…':editing?'Guardar cambios':guests?'Crear huésped':'Crear consulta'}</button></div>
      </form>
    </AdminDialog>
  </>;
}
export function GuestManager({initial,canEdit}:{initial:AdminGuest[];canEdit:boolean}) {
  return <ContactManager kind="guests" canEdit={canEdit} records={initial.map(g=>({id:g.id,firstName:g.first_name,lastName:g.last_name,name:g.first_name+' '+g.last_name,phone:g.phone,email:g.email??''}))}/>;
}
export function InquiryManager({initial}:{initial:AdminInquiry[]}) {
  return <ContactManager kind="events" records={initial.map(e=>({id:e.id,contactName:e.contact_name,email:e.email,phone:e.phone,eventType:e.event_type,preferredDate:e.preferred_date??'',guestsCount:e.guests_count===null?'':String(e.guests_count),notes:e.notes??'',status:e.status,statusLabel:statusLabels[e.status]}))}/>;
}
