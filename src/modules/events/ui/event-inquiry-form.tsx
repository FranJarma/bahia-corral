'use client';

import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import { DatePicker } from '@/modules/shared-ui/date-picker';
import { ValidatedLabel } from '@/modules/shared-ui/validated-label';

export function EventInquiryForm() {
  const [busy, setBusy] = useState(false);
  const [preferredDate, setPreferredDate] = useState('');
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const formElement = event.currentTarget;
      const form = new FormData(formElement);
      const data = Object.fromEntries(form.entries());
      const response = await fetch('/api/public/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          guestsCount: data.guestsCount ? Number(data.guestsCount) : undefined,
        }),
      });
      const resultData = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(resultData.error ?? 'No pudimos enviar tu consulta.');
      setResult({
        type: 'success',
        text: resultData.message ?? 'Recibimos tu consulta. Nos comunicaremos a la brevedad.',
      });
      formElement.reset();
      setPreferredDate('');
    } catch (error) {
      setResult({
        type: 'error',
        text: error instanceof Error ? error.message : 'Revisá tu conexión e intentá nuevamente.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e6dbce] bg-cream-soft">
      <div className="relative h-[225px] md:h-[320px]">
        <Image
          src="/images/eventos-figma.jpg"
          alt="Celebración frente al agua en un espacio natural"
          fill
          sizes="(max-width:768px) 100vw,1040px"
          className="object-cover"
        />
      </div>
      <form onSubmit={(event) => void submit(event)} className="px-6 pt-8 pb-9 md:px-8 md:pt-7">
        <div className="text-center">
          <h2 className="editorial text-[34px] leading-tight md:text-[42px]">
            Celebraciones frente al agua
          </h2>
          <p className="mt-3 text-xs leading-6 text-muted">
            Eventos privados y corporativos, con posibilidad de alojamiento para tus invitados.
          </p>
        </div>
        <div className="public-field-group mt-7">
          <ValidatedLabel className="public-form-label">
            Tipo de evento
            <select required name="eventType" defaultValue="">
              <option value="" disabled>
                Seleccionar
              </option>
              <option value="Casamiento">Casamiento</option>
              <option value="Cumpleaños">Cumpleaños</option>
              <option value="Corporativo">Corporativo</option>
              <option value="Social">Evento social</option>
              <option value="Otro">Otro</option>
            </select>
          </ValidatedLabel>
          <label className="public-form-label">
            Fecha estimada
            <DatePicker onValueChange={setPreferredDate}>
              <input
                name="preferredDate"
                type="date"
                value={preferredDate}
                onChange={(event) => setPreferredDate(event.target.value)}
              />
            </DatePicker>
          </label>
          <label className="public-form-label">
            Cantidad de personas
            <input name="guestsCount" min="1" type="number" placeholder="Aproximada" />
          </label>
          <ValidatedLabel className="public-form-label">
            Nombre y apellido
            <input
              required
              name="contactName"
              autoComplete="name"
              placeholder="Escribí tu nombre"
            />
          </ValidatedLabel>
          <ValidatedLabel className="public-form-label">
            Email
            <input
              required
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Escribí tu email"
            />
          </ValidatedLabel>
          <ValidatedLabel className="public-form-label">
            Teléfono
            <input
              required
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="Escribí tu teléfono"
            />
          </ValidatedLabel>
        </div>
        <label className="public-form-label mt-4">
          Mensaje
          <textarea
            name="notes"
            rows={3}
            maxLength={1800}
            placeholder="Contanos más sobre tu evento…"
          />
        </label>
        <details className="group mt-5 text-xs">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between font-semibold text-ink">
            Agregar detalles del evento (opcional)
            <span aria-hidden="true" className="text-lg transition-transform group-open:rotate-180">
              ⌄
            </span>
          </summary>
          <p className="mt-2 text-[11px] leading-5 text-muted">
            Incluí preferencias, espacios o información importante en el campo Mensaje. Nuestro
            equipo prepara un presupuesto personalizado.
          </p>
        </details>
        {result && (
          <p
            role="status"
            className={`my-4 rounded-lg p-3 text-xs ${result.type === 'success' ? 'bg-[#e1f3e7] text-[#176a4f]' : 'bg-red-50 text-red-900'}`}
          >
            {result.text}
          </p>
        )}
        <button
          type="submit"
          className="primary-button mt-4 w-full uppercase md:w-auto"
          disabled={busy}
        >
          {busy ? 'Enviando consulta…' : 'Enviar consulta'} <ArrowRight size={15} />
        </button>
      </form>
    </div>
  );
}
