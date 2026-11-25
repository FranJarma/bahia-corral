'use client';
import * as Popover from '@radix-ui/react-popover';
import { format, isValid, parseISO } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { cloneElement, type ComponentProps, type ReactElement, useId, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'react-day-picker/locale';

function date(value:unknown) {
  if(typeof value!=='string'||!value)return undefined;
  const parsed=parseISO(value);
  return isValid(parsed)?parsed:undefined;
}
const dayName=new Intl.DateTimeFormat('es-AR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const shortName=new Intl.DateTimeFormat('es-AR',{day:'numeric',month:'short',year:'numeric'});

export function DatePicker({children,onValueChange}:{children:ReactElement<ComponentProps<'input'>>;onValueChange:(value:string)=>void}) {
  const [open,setOpen]=useState(false);
  const [pending,setPending]=useState<Date|undefined>();
  const anchor=useRef<HTMLInputElement|null>(null);
  const id=useId();
  const props=children.props;
  const selected=date(props.value),minimum=date(props.min),maximum=date(props.max);
  const disabledDates=[...(minimum?[{before:minimum}]:[]),...(maximum?[{after:maximum}]:[])];
  function changeOpen(next:boolean) {if(next)setPending(date(props.value));setOpen(next);}
  return <Popover.Root open={open} onOpenChange={changeOpen} modal>
    <Popover.Anchor asChild>
      {cloneElement(children,{
        className:[props.className,'brand-date-input'].filter(Boolean).join(' '),
        'aria-haspopup':'dialog','aria-expanded':open,'aria-controls':open?id:undefined,
        onFocus:event=>{anchor.current=event.currentTarget;props.onFocus?.(event);},
        onPointerDown:event=>{
          props.onPointerDown?.(event);
          if(event.defaultPrevented||props.disabled||event.button!==0)return;
          event.preventDefault();anchor.current=event.currentTarget;changeOpen(true);
        },
        onClick:event=>{props.onClick?.(event);event.preventDefault();if(!props.disabled&&!open){anchor.current=event.currentTarget;changeOpen(true);}},
        onKeyDown:event=>{
          props.onKeyDown?.(event);
          if(!event.defaultPrevented&&(event.key==='Enter'||event.key==='F4'||(event.altKey&&event.key==='ArrowDown'))){
            event.preventDefault();anchor.current=event.currentTarget;changeOpen(true);
          }
        }
      })}
    </Popover.Anchor>
    <Popover.Portal>
      <Popover.Content id={id} aria-label="Elegir fecha" className="brand-date-popover" sideOffset={8} collisionPadding={12}
        onOpenAutoFocus={event=>event.preventDefault()}
        onCloseAutoFocus={event=>{event.preventDefault();if(anchor.current?.isConnected)anchor.current.focus();}}>
        <DayPicker className="brand-calendar" mode="single" required selected={pending} onSelect={setPending}
          defaultMonth={selected??minimum} startMonth={minimum} endMonth={maximum}
          disabled={disabledDates} locale={es} lang="es-AR" weekStartsOn={1} navLayout="around" showOutsideDays fixedWeeks autoFocus
          labels={{
            labelPrevious:()=> 'Mes anterior',labelNext:()=> 'Mes siguiente',
            labelDayButton:(value,modifiers)=>dayName.format(value)+(modifiers.today?', hoy':'')+(modifiers.selected?', seleccionado':'')
          }}
        />
        <p aria-live="polite" className="mt-3 text-center text-xs font-semibold text-ink">{pending?shortName.format(pending):'Elegí una fecha'}</p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <Popover.Close asChild><button type="button" className="min-h-11 px-2 text-xs font-semibold underline underline-offset-4">Cerrar</button></Popover.Close>
          <button type="button" className="primary-button !min-h-11 !px-5 !text-xs" disabled={!pending} onClick={()=>{if(pending){onValueChange(format(pending,'yyyy-MM-dd'));changeOpen(false);}}}>Aplicar fecha <ArrowRight size={15} aria-hidden="true"/></button>
        </div>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>;
}
