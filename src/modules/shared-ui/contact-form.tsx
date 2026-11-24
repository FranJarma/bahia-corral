'use client';

import { ArrowRight } from 'lucide-react';
import { useState } from 'react';

const interests = ['Alquiler de cabañas', 'SPA', 'Excursión náutica', 'Restaurante'];

export function ContactForm() {
  const [selected, setSelected] = useState<string[]>([]);
  const [emailOpened, setEmailOpened] = useState(false);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '');
    const email = String(form.get('email') ?? '');
    const message = String(form.get('message') ?? '');
    const body = [
      `Nombre: ${name}`,
      `Email: ${email}`,
      `Servicios de interés: ${selected.join(', ') || 'No especificados'}`,
      '',
      message,
    ].join('\n');
    const subject = encodeURIComponent(`Consulta desde Bahía Corral — ${name}`);
    window.location.href = `mailto:reservas@bahiacorral.com?subject=${subject}&body=${encodeURIComponent(body)}`;
    setEmailOpened(true);
  }
  return (
    <form onSubmit={submit} className="rounded-2xl bg-cream-soft px-6 py-8 md:px-8">
      <h2 className="editorial text-[26px]">Envianos una consulta</h2>
      <p className="mt-2 text-[11px] leading-6 text-muted">
        Contanos qué tenés en mente y te ayudamos a planificar tu visita.
      </p>
      <div className="mt-7 grid gap-5">
        <label className="public-form-label">
          Nombre y apellido *
          <input required name="name" autoComplete="name" placeholder="Tu nombre" />
        </label>
        <label className="public-form-label">
          Email *
          <input
            required
            name="email"
            autoComplete="email"
            type="email"
            placeholder="tu@email.com"
          />
        </label>
        <fieldset>
          <legend className="text-[12px] font-semibold">¿Qué servicios te interesan?</legend>
          <p className="my-3 text-[11px] text-muted">Opcional · Podés elegir más de uno.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {interests.map((label) => (
              <label
                key={label}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#d2c9bb] bg-white px-3 text-xs"
              >
                <input
                  type="checkbox"
                  className="!h-4 !min-h-0 !w-4 shrink-0 accent-[#173747]"
                  checked={selected.includes(label)}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, label]
                        : current.filter((x) => x !== label),
                    )
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="public-form-label">
          Mensaje *
          <textarea required name="message" rows={4} placeholder="¿En qué podemos ayudarte?" />
        </label>
      </div>
      <p className="mt-4 text-[11px] leading-6 text-muted">Los campos con * son obligatorios.</p>
      <button type="submit" className="primary-button mt-5 w-full uppercase">
        Enviar mensaje <ArrowRight size={15} />
      </button>
      {emailOpened && (
        <p className="mt-4 text-[11px] leading-5 text-muted" role="status">
          Se abrió tu aplicación de correo. Revisá que el mensaje se haya enviado; desde esta página
          no se confirma el envío.
        </p>
      )}
    </form>
  );
}
