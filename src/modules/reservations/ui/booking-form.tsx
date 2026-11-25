'use client';

import { ArrowRight, CalendarDays, Check, ChevronDown, Home, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { PUBLIC_UNITS } from '@/modules/accommodations/domain/seed-units';
import { DatePicker } from '@/modules/shared-ui/date-picker';
import { ValidatedLabel } from '@/modules/shared-ui/validated-label';

type Step = 'DATES' | 'CONTACT' | 'PAYMENT';
type Hold = {
  holdId: string;
  quoteId: string;
  expiresAt: string;
  totalCents: string;
  depositCents: string;
  checkoutToken: string;
};
type ApiError = { error?: string };

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const json = (await response.json()) as T & ApiError;
  if (!response.ok) throw new Error(json.error || 'No pudimos completar la operación.');
  return json;
}
function formatCents(value: string) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(BigInt(value)) / 100);
}
function formatDay(value: string) {
  if (!value) return 'A definir';
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`));
}
function numberOfNights(checkin: string, checkout: string) {
  const start = Date.parse(`${checkin}T12:00:00Z`),
    end = Date.parse(`${checkout}T12:00:00Z`);
  return Number.isFinite(start) && Number.isFinite(end)
    ? Math.max(0, Math.round((end - start) / 86400000))
    : 0;
}

export function BookingForm({
  defaultSlug,
  defaultCheckin = '',
  defaultCheckout = '',
  defaultAdults = 2,
  defaultMinors = 0,
}: {
  defaultSlug?: string;
  defaultCheckin?: string;
  defaultCheckout?: string;
  defaultAdults?: number;
  defaultMinors?: number;
}) {
  const [slug, setSlug] = useState(
    defaultSlug && PUBLIC_UNITS.some((u) => u.slug === defaultSlug)
      ? defaultSlug
      : PUBLIC_UNITS[0].slug,
  );
  const [unitId, setUnitId] = useState('');
  const [checkin, setCheckin] = useState(defaultCheckin);
  const [checkout, setCheckout] = useState(defaultCheckout);
  const [adults, setAdults] = useState(Math.max(1, Math.min(8, defaultAdults)));
  const [children, setChildren] = useState<number[]>(
    Array.from({ length: Math.max(0, Math.min(7, defaultMinors)) }, () => 0),
  );
  const [step, setStep] = useState<Step>('DATES');
  const [hold, setHold] = useState<Hold | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [reservationId, setReservationId] = useState('');
  const [purpose, setPurpose] = useState<'DEPOSIT' | 'FULL'>('DEPOSIT');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(0);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [today] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const unit = useMemo(() => PUBLIC_UNITS.find((u) => u.slug === slug), [slug]);
  const nights = numberOfNights(checkin, checkout);
  const capacity = unit?.capacityTotal ?? 8;
  const expired = Boolean(
    hold && clock >= new Date(hold.expiresAt).getTime() && step === 'CONTACT',
  );
  const seconds = hold
    ? Math.max(0, Math.floor((new Date(hold.expiresAt).valueOf() - clock) / 1000))
    : 0;
  const total = hold ? formatCents(hold.totalCents) : null;
  const deposit = hold ? formatCents(hold.depositCents) : null;

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      setUnitId('');
      setError('');
    });
    fetch(`/api/public/units?slug=${encodeURIComponent(slug)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error('Servicio de reservas no disponible');
        return r.json();
      })
      .then((value: { unit: { id: string } }) => {
        if (!controller.signal.aborted) setUnitId(value.unit.id);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError('No pudimos cargar el alojamiento. Intentá nuevamente.');
      });
    return () => controller.abort();
  }, [slug]);
  useEffect(() => {
    if (!hold) return;
    const id = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [hold]);
  useEffect(() => {
    if (!summaryOpen) return;
    const prior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSummaryOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => {
      document.body.style.overflow = prior;
      window.removeEventListener('keydown', close);
    };
  }, [summaryOpen]);

  async function begin() {
    setError('');
    setBusy(true);
    try {
      if (!unitId) throw new Error('El alojamiento no está disponible para reservar.');
      if (!checkin || !checkout || checkin >= checkout)
        throw new Error('Elegí una salida posterior a la llegada.');
      if (adults + children.length > capacity)
        throw new Error('La cantidad de huéspedes supera la capacidad de este alojamiento.');
      const next = await post<Hold>('/api/public/checkout/start', {
        unitId,
        checkin,
        checkout,
        adults,
        childAges: children,
      });
      setHold(next);
      setClock(Date.now());
      setStep('CONTACT');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar tu reserva.');
    } finally {
      setBusy(false);
    }
  }
  async function saveContact() {
    if (!hold || expired) return;
    setError('');
    setBusy(true);
    try {
      const result = await post<{ reservationId: string }>('/api/public/checkout/guest', {
        holdId: hold.holdId,
        checkoutToken: hold.checkoutToken,
        contact: { firstName, lastName, email, phone },
      });
      setReservationId(result.reservationId);
      setStep('PAYMENT');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron guardar tus datos.');
    } finally {
      setBusy(false);
    }
  }
  async function initiatePayment() {
    if (!hold || !reservationId) return;
    setBusy(true);
    setError('');
    try {
      const result = await post<{ checkoutUrl: string }>('/api/public/checkout/pay', {
        reservationId,
        purpose,
        checkoutToken: hold.checkoutToken,
      });
      if (!result.checkoutUrl.startsWith('https://')) throw new Error('URL de pago inválida');
      window.location.assign(result.checkoutUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos iniciar el pago.');
    } finally {
      setBusy(false);
    }
  }
  function next() {
    if (step === 'DATES') void begin();
    else if (step === 'CONTACT') void saveContact();
    else void initiatePayment();
  }
  const steps: { id: Step; label: string; Icon: typeof Home }[] = [
    { id: 'DATES', label: 'Estadía y cabaña', Icon: Home },
    { id: 'CONTACT', label: 'Datos y pago', Icon: CalendarDays },
    { id: 'PAYMENT', label: 'Confirmación', Icon: Check },
  ];
  const buttonText =
    step === 'DATES'
      ? 'Continuar'
      : step === 'CONTACT'
        ? 'Continuar a pago'
        : 'Pagar con Mercado Pago';
  return (
    <div className="pb-28 md:pb-0">
      <nav className="public-breadcrumb hidden md:flex" aria-label="Migas de pan">
        <Link href="/">Inicio</Link>
        <span>/</span>
        <Link href="/alojamientos">Alojamientos</Link>
        <span>/</span>
        <span>{unit?.name}</span>
        <span>/</span>
        <strong className="text-ink">Completar reserva</strong>
      </nav>
      <p className="mt-2 text-center text-xs text-muted md:hidden">
        1 Estadía → 2 Datos y pago → 3 Confirmación
      </p>
      <h1 className="editorial mt-4 text-center text-[39px] leading-tight md:mt-5 md:text-left md:text-[50px]">
        {step === 'DATES'
          ? 'Completá tu reserva'
          : step === 'CONTACT'
            ? 'Tus datos para reservar'
            : 'Elegí cómo pagar'}
      </h1>
      <p className="mt-2 max-w-[520px] text-center text-[12px] leading-6 text-muted md:text-left">
        {step === 'DATES'
          ? 'Ajustá las fechas y cuántos son. A la derecha ves siempre la reserva que estás armando. En pocos pasos la confirmás.'
          : step === 'CONTACT'
            ? 'Completá tus datos para vincular la reserva con tu email. No necesitás crear una cuenta.'
            : 'Tu estadía está protegida temporalmente. Elegí si preferís pagar la seña o la estadía completa.'}
      </p>
      <ol
        className="my-9 hidden items-center gap-4 text-xs md:flex"
        aria-label="Pasos de tu reserva"
      >
        {steps.map(({ id, label, Icon }, i) => (
          <li className="flex items-center gap-2" key={String(id)}>
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full border ${step === id ? 'border-ink bg-ink text-white' : 'border-[#ded2c2] text-muted'}`}
            >
              <Icon size={16} />
            </span>
            <span className={step === id ? 'font-semibold' : 'text-muted'}>
              {i + 1}. {String(label)}
            </span>
            {i < 2 && <span className="ml-2 h-px w-8 bg-[#dfd4c3] lg:w-14" />}
          </li>
        ))}
      </ol>
      <div className="mt-7 grid items-start gap-6 md:mt-0 md:grid-cols-[minmax(0,1.5fr)_minmax(315px,.9fr)] md:gap-8">
        <div className="rounded-2xl border border-[#e5d8c7] bg-cream-soft p-6 md:p-8">
          <h2 className="editorial text-[27px] md:text-[31px]">
            {step === 'DATES'
              ? 'Datos de tu estadía'
              : step === 'CONTACT'
                ? 'Datos de contacto'
                : 'Opciones de pago'}
          </h2>
          <p className="mt-2 text-xs leading-6 text-muted">
            {step === 'DATES'
              ? 'Elegí las fechas, los huéspedes, la cantidad de menores y tu cabaña.'
              : step === 'CONTACT'
                ? 'Usaremos esta información para confirmar y administrar tu reserva.'
                : 'El pago se realiza en el sitio seguro de Mercado Pago.'}
          </p>
          {hold && (
            <p className="mt-4 rounded-lg bg-[#ebf1eb] p-3 text-xs text-ink" aria-live="polite">
              {seconds > 0
                ? `Cotización protegida por ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} minutos.`
                : 'El tiempo de pago venció. Si ya pagaste, verificaremos el resultado.'}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-800">
              {error}
            </p>
          )}
          {step === 'DATES' && (
            <form
              id="booking-step-form"
              onSubmit={(event) => {
                event.preventDefault();
                void begin();
              }}
              className="mt-6 grid gap-5"
            >
              <div className="public-field-group">
                <ValidatedLabel className="public-form-label">
                  Check-in
                  <DatePicker onValueChange={setCheckin}>
                    <input
                      required
                      type="date"
                      value={checkin}
                      min={today}
                      onChange={(event) => setCheckin(event.target.value)}
                    />
                  </DatePicker>
                </ValidatedLabel>
                <ValidatedLabel className="public-form-label">
                  Check-out
                  <DatePicker onValueChange={setCheckout}>
                    <input
                      required
                      type="date"
                      value={checkout}
                      min={checkin}
                      onChange={(event) => setCheckout(event.target.value)}
                    />
                  </DatePicker>
                </ValidatedLabel>
              </div>
              <p role="status" aria-live="polite" className="text-xs text-muted">
                Cantidad de noches:{' '}
                <output aria-label="Cantidad de noches" className="font-semibold text-ink">
                  {nights > 0
                    ? `${nights} ${nights === 1 ? 'noche' : 'noches'}`
                    : 'Elegí fechas válidas'}
                </output>
              </p>
              <div className="public-field-group">
                <label className="public-form-label">
                  Adultos *
                  <select
                    value={adults}
                    onChange={(event) => {
                      const v = Number(event.target.value);
                      setAdults(v);
                      if (children.length + v > capacity)
                        setChildren((old) => old.slice(0, capacity - v));
                    }}
                  >
                    {Array.from({ length: capacity }, (_, i) => (
                      <option key={i} value={i + 1}>
                        {i + 1} {i + 1 === 1 ? 'adulto' : 'adultos'}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="public-form-label">
                  Menores *
                  <select
                    value={children.length}
                    onChange={(event) =>
                      setChildren(Array.from({ length: Number(event.target.value) }, () => 0))
                    }
                  >
                    {Array.from({ length: capacity - adults + 1 }, (_, i) => (
                      <option key={i} value={i}>
                        {i} {i === 1 ? 'menor' : 'menores'}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {children.map((age, i) => (
                <label key={i} className="public-form-label">
                  Edad del menor {i + 1}
                  <select
                    value={age}
                    onChange={(event) =>
                      setChildren((old) =>
                        old.map((x, index) => (index === i ? Number(event.target.value) : x)),
                      )
                    }
                  >
                    {Array.from({ length: 18 }, (_, x) => (
                      <option key={x} value={x}>
                        {x} {x === 1 ? 'año' : 'años'}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <p className="text-[11px] leading-5 text-muted">
                Los menores de 4 años no pagan, pero todos cuentan para la capacidad.
              </p>
              <label className="public-form-label">
                Cabaña
                <div className="relative">
                  <div className="flex min-h-[88px] items-center gap-3 rounded-xl border border-[#d6c6b5] bg-white p-3">
                    <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={`/images/${unit?.slug ?? 'cabana-1'}.jpg`}
                        fill
                        sizes="80px"
                        alt=""
                        className="object-cover"
                      />
                    </div>
                    <span className="min-w-0 flex-1">
                      <span className="editorial block text-[23px]">{unit?.name}</span>
                      <span className="block text-xs font-normal text-muted">
                        Hasta {capacity} huéspedes
                      </span>
                    </span>
                    <span className="hidden text-right text-xs font-semibold sm:block">
                      {unit?.fromPrice}
                      <span className="block text-[10px] font-normal text-muted">por noche</span>
                    </span>
                    <ChevronDown size={17} />
                  </div>
                  <select
                    aria-label="Elegir alojamiento"
                    value={slug}
                    onChange={(event) => setSlug(event.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  >
                    {PUBLIC_UNITS.map((u) => (
                      <option key={u.code} value={u.slug}>
                        {u.name} · hasta {u.capacityTotal} huéspedes
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <button
                type="submit"
                disabled={busy || !unitId}
                className="primary-button mt-2 hidden w-full uppercase md:inline-flex"
              >
                {busy ? 'Consultando…' : 'Continuar'} <ArrowRight size={15} />
              </button>
            </form>
          )}
          {step === 'CONTACT' && (
            <form
              id="booking-contact-form"
              onSubmit={(event) => {
                event.preventDefault();
                void saveContact();
              }}
              className="mt-6 grid gap-5"
            >
              <div className="public-field-group">
                <ValidatedLabel className="public-form-label">
                  Nombre
                  <input
                    required
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Tu nombre"
                  />
                </ValidatedLabel>
                <ValidatedLabel className="public-form-label">
                  Apellido
                  <input
                    required
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Tu apellido"
                  />
                </ValidatedLabel>
              </div>
              <ValidatedLabel className="public-form-label">
                Correo electrónico
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                />
              </ValidatedLabel>
              <ValidatedLabel className="public-form-label">
                Teléfono
                <input
                  required
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Tu teléfono"
                />
              </ValidatedLabel>
              <p className="text-[11px] leading-6 text-muted">
                Al continuar, aceptás las{' '}
                <Link className="underline" href="/terminos-y-condiciones">
                  condiciones de reserva
                </Link>
                .
              </p>
              <button
                disabled={busy || expired}
                type="submit"
                className="primary-button hidden w-full uppercase md:inline-flex"
              >
                Continuar a pago <ArrowRight size={15} />
              </button>
            </form>
          )}
          {step === 'PAYMENT' && (
            <div className="mt-6 grid gap-5">
              <fieldset>
                <legend className="mb-4 text-xs font-semibold">Elegí una opción de pago</legend>
                <label
                  className={`mb-3 flex cursor-pointer items-center gap-3 rounded-xl border bg-white p-5 ${purpose === 'DEPOSIT' ? 'border-ink' : 'border-[#dfd4c6]'}`}
                >
                  <input
                    type="radio"
                    name="purpose"
                    checked={purpose === 'DEPOSIT'}
                    onChange={() => setPurpose('DEPOSIT')}
                    className="!h-4 !min-h-0 !w-4 accent-[#173747]"
                  />
                  <span className="flex-1 text-xs font-semibold">Pagar seña (50%)</span>
                  <span className="text-xs">{deposit}</span>
                </label>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-white p-5 ${purpose === 'FULL' ? 'border-ink' : 'border-[#dfd4c6]'}`}
                >
                  <input
                    type="radio"
                    name="purpose"
                    checked={purpose === 'FULL'}
                    onChange={() => setPurpose('FULL')}
                    className="!h-4 !min-h-0 !w-4 accent-[#173747]"
                  />
                  <span className="flex-1 text-xs font-semibold">Pagar estadía completa</span>
                  <span className="text-xs">{total}</span>
                </label>
              </fieldset>
              <p className="text-[11px] leading-6 text-muted">
                El regreso de Mercado Pago no confirma el cobro por sí solo. Verificaremos el pago
                antes de confirmar tu reserva.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void initiatePayment()}
                className="primary-button hidden w-full uppercase md:inline-flex"
              >
                {busy ? 'Conectando…' : 'Pagar con Mercado Pago'} <ArrowRight size={15} />
              </button>
            </div>
          )}
          {step !== 'DATES' && (
            <button
              className="mt-6 text-xs font-semibold text-ink underline underline-offset-4"
              type="button"
              onClick={() => {
                setStep(step === 'PAYMENT' ? 'CONTACT' : 'DATES');
                setError('');
              }}
            >
              Volver al paso anterior
            </button>
          )}
        </div>
        <aside
          className="hidden overflow-hidden rounded-2xl border border-[#e1d5c5] bg-cream-soft md:block"
          aria-label="Resumen de tu reserva"
        >
          <div className="relative aspect-[1.65]">
            <Image
              src={`/images/${unit?.slug ?? 'cabana-1'}.jpg`}
              alt={unit?.name ?? 'Alojamiento'}
              fill
              sizes="400px"
              className="object-cover"
            />
          </div>
          <div className="p-6">
            <p className="public-kicker">Tu reserva</p>
            <h2 className="editorial mt-2 text-[27px]">{unit?.name}</h2>
            <dl className="mt-5 grid gap-3 border-y border-[#e7dccd] py-5 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Fechas</dt>
                <dd className="text-right">
                  {checkin && checkout
                    ? `${formatDay(checkin)} → ${formatDay(checkout)}`
                    : 'A seleccionar'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Noches</dt>
                <dd>{nights || '–'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Huéspedes</dt>
                <dd>
                  {adults + children.length} · {adults} adultos · {children.length} menores
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex justify-between gap-3 text-xs">
              <span>Total estadía</span>
              <strong>{total ?? 'Se calcula al continuar'}</strong>
            </div>
            {hold && (
              <div className="mt-3 flex justify-between gap-3 text-xs text-muted">
                <span>Seña requerida</span>
                <span>{deposit}</span>
              </div>
            )}
            <p className="mt-4 text-[10px] leading-5 text-muted">
              {hold
                ? 'Cotización calculada por el servidor y protegida durante el checkout.'
                : 'Las tarifas son orientativas hasta que se confirme la disponibilidad.'}
            </p>
            <button
              type={step === 'PAYMENT' ? 'button' : 'submit'}
              form={
                step === 'DATES'
                  ? 'booking-step-form'
                  : step === 'CONTACT'
                    ? 'booking-contact-form'
                    : undefined
              }
              disabled={busy || expired || (step === 'DATES' && !unitId)}
              onClick={step === 'PAYMENT' ? next : undefined}
              className="primary-button mt-6 w-full uppercase"
            >
              {busy ? 'Procesando…' : buttonText} <ArrowRight size={15} />
            </button>
          </div>
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e5dace] bg-white px-6 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] md:hidden">
        <div className="flex justify-between gap-4 text-[12px]">
          <strong>Total estadía · {total ?? 'A confirmar'}</strong>
          <button
            type="button"
            onClick={() => setSummaryOpen(true)}
            className="font-semibold underline underline-offset-4"
          >
            Ver resumen
          </button>
        </div>
        <button
          type={step === 'PAYMENT' ? 'button' : 'submit'}
          form={
            step === 'DATES'
              ? 'booking-step-form'
              : step === 'CONTACT'
                ? 'booking-contact-form'
                : undefined
          }
          disabled={busy || expired || (step === 'DATES' && !unitId)}
          onClick={step === 'PAYMENT' ? next : undefined}
          className="primary-button mt-3 w-full uppercase"
        >
          {busy ? 'Procesando…' : buttonText} <ArrowRight size={15} />
        </button>
      </div>
      {summaryOpen && (
        <div
          className="fixed inset-0 z-[75] overflow-y-auto bg-cream p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Resumen de reserva"
        >
          <div className="flex items-center justify-between">
            <h2 className="editorial text-[28px]">Tu reserva</h2>
            <button
              className="flex h-11 w-11 items-center justify-center"
              aria-label="Cerrar resumen"
              onClick={() => setSummaryOpen(false)}
            >
              <X />
            </button>
          </div>
          <div className="relative mt-5 aspect-[1.7] overflow-hidden rounded-2xl">
            <Image
              src={`/images/${unit?.slug ?? 'cabana-1'}.jpg`}
              alt={unit?.name ?? 'Cabaña'}
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>
          <h3 className="editorial mt-6 text-[30px]">{unit?.name}</h3>
          <p className="mt-3 text-sm">
            {checkin && checkout
              ? `${formatDay(checkin)} al ${formatDay(checkout)}`
              : 'Elegí tus fechas'}
          </p>
          <p className="mt-3 text-sm">
            {nights} noches · {adults + children.length} huéspedes
          </p>
          <p className="mt-5 border-t py-5 text-base font-semibold">
            Total: {total ?? 'A confirmar'}
          </p>
          {hold && <p className="text-sm">Seña: {deposit}</p>}
          <button
            type="button"
            className="primary-button mt-8 w-full"
            onClick={() => setSummaryOpen(false)}
          >
            Volver a la reserva
          </button>
        </div>
      )}
    </div>
  );
}
