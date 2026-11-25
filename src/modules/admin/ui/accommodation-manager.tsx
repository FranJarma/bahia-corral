'use client';
import { X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import type { AdminUnit } from '@/modules/accommodations/application/manage-units';
import {
  centsToPesos,
  pesosToCents,
  type RateBandInput,
} from '@/modules/pricing/domain/rate-bands';
import { AdminDialog } from '@/modules/shared-ui/admin-dialog';
import { SearchField } from '@/modules/shared-ui/search-field';
import { ValidatedLabel } from '@/modules/shared-ui/validated-label';

type DraftBand = { minGuests: number; maxGuests: number; amount: string };
function drafts(bands: RateBandInput[]): DraftBand[] {
  return bands.map((b) => ({ ...b, amount: centsToPesos(b.amountCents) }));
}
function bandsForSave(bands: DraftBand[]): RateBandInput[] {
  return bands.map((b) => ({
    minGuests: b.minGuests,
    maxGuests: b.maxGuests,
    amountCents: pesosToCents(b.amount),
  }));
}
function BandsEditor({
  bands,
  setBands,
  capacity,
}: {
  bands: DraftBand[];
  setBands: (bands: DraftBand[]) => void;
  capacity: number;
}) {
  function change(index: number, key: keyof DraftBand, value: string) {
    setBands(
      bands.map((b, i) =>
        i === index ? { ...b, [key]: key === 'amount' ? value : Number(value) } : b,
      ),
    );
  }
  return (
    <fieldset className="grid gap-4">
      <legend className="mb-3 text-sm font-semibold">Tarifas por ocupación</legend>
      {bands.map((band, i) => (
        <div key={i} className="grid items-end gap-3 sm:grid-cols-[80px_80px_minmax(0,1fr)_44px]">
          <ValidatedLabel className="public-form-label">
            Desde
            <input
              required
              type="number"
              min={1}
              max={capacity}
              value={band.minGuests}
              onChange={(e) => change(i, 'minGuests', e.target.value)}
            />
          </ValidatedLabel>
          <ValidatedLabel className="public-form-label">
            Hasta
            <input
              required
              type="number"
              min={1}
              max={capacity}
              value={band.maxGuests}
              onChange={(e) => change(i, 'maxGuests', e.target.value)}
            />
          </ValidatedLabel>
          <ValidatedLabel className="public-form-label">
            Tarifa {i + 1} (ARS por noche)
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={band.amount}
              onChange={(e) => change(i, 'amount', e.target.value)}
            />
          </ValidatedLabel>
          <button
            type="button"
            className="min-h-11 rounded-lg border px-2 text-sm hover:bg-sand disabled:opacity-40"
            aria-label={'Quitar tramo ' + (i + 1)}
            disabled={bands.length === 1}
            onClick={() => setBands(bands.filter((_, j) => i !== j))}
          >
            <X size={18} aria-hidden="true" className="mx-auto" />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="justify-self-start text-xs font-semibold underline underline-offset-4"
        onClick={() =>
          setBands([
            ...bands,
            { minGuests: (bands.at(-1)?.maxGuests ?? 0) + 1, maxGuests: capacity, amount: '' },
          ])
        }
      >
        Agregar tramo
      </button>
      <p className="text-xs leading-6 text-muted">
        Los tramos deben cubrir de 1 a {capacity} huéspedes, sin huecos ni superposiciones. Los
        menores de 4 años no pagan.
      </p>
    </fieldset>
  );
}
function RateEditor({
  unit,
  onSaved,
  onCancel,
}: {
  unit: AdminUnit;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [bands, setBands] = useState(() => drafts(unit.bands));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId: unit.id, bands: bandsForSave(bands) }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? 'No se pudieron guardar las tarifas.');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="admin-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <BandsEditor bands={bands} setBands={setBands} capacity={unit.capacity_total} />
      <p className="text-xs text-muted">
        Las reservas existentes conservan sus precios históricos.
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="admin-form-actions">
        <button type="button" className="secondary-button" disabled={busy} onClick={onCancel}>
          Cancelar
        </button>
        <button className="primary-button" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar tarifas'}
        </button>
      </div>
    </form>
  );
}
function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
function UnitEditor({
  unit,
  onSaved,
  onCancel,
}: {
  unit: AdminUnit | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(unit?.name ?? ''),
    [code, setCode] = useState(unit?.code ?? ''),
    [slug, setSlug] = useState(unit?.slug ?? '');
  const [type, setType] = useState(unit?.type ?? 'CABIN'),
    [capacity, setCapacity] = useState(unit?.capacity_total ?? 4);
  const [description, setDescription] = useState(unit?.description ?? ''),
    [photo, setPhoto] = useState(unit?.image_url ?? '');
  const [published, setPublished] = useState(unit?.published ?? false),
    [status, setStatus] = useState(unit?.operational_status ?? 'ACTIVE');
  const [bands, setBands] = useState<DraftBand[]>(() =>
    unit ? drafts(unit.bands) : [{ minGuests: 1, maxGuests: 4, amount: '' }],
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/units', {
        method: unit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: unit?.id,
          name,
          code,
          slug,
          type,
          capacityTotal: capacity,
          description,
          imageUrl: photo,
          published,
          operationalStatus: status,
          bands: bandsForSave(bands),
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? 'No se pudo guardar el alojamiento.');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="admin-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <ValidatedLabel className="public-form-label">
          Nombre
          <input
            required
            minLength={3}
            maxLength={120}
            value={name}
            onChange={(e) => {
              const next = e.target.value;
              if (!unit && (!slug || slug === slugify(name))) setSlug(slugify(next));
              setName(next);
            }}
          />
        </ValidatedLabel>
        <ValidatedLabel className="public-form-label">
          Código
          <input required maxLength={30} value={code} onChange={(e) => setCode(e.target.value)} />
        </ValidatedLabel>
        <ValidatedLabel className="public-form-label">
          Identificador en la web
          <input
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </ValidatedLabel>
        <label className="public-form-label">
          Tipo
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="CABIN">Cabaña</option>
            <option value="STUDIO">Monoambiente</option>
            <option value="ROOM">Habitación</option>
          </select>
        </label>
        <ValidatedLabel className="public-form-label">
          Capacidad máxima
          <input
            required
            type="number"
            min={1}
            max={50}
            value={capacity}
            onChange={(e) => {
              const n = Number(e.target.value);
              setCapacity(n);
              if (bands.length === 1) setBands([{ ...bands[0], maxGuests: n }]);
            }}
          />
        </ValidatedLabel>
        <label className="public-form-label">
          Estado operativo
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="ACTIVE">Activo</option>
            <option value="INACTIVE">Fuera de servicio</option>
          </select>
        </label>
      </div>
      <label className="public-form-label">
        Descripción
        <textarea
          rows={3}
          maxLength={3000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <label className="public-form-label">
        Foto (URL o ruta de imagen)
        <input
          placeholder="https://… o /images/foto.jpg"
          value={photo}
          onChange={(e) => setPhoto(e.target.value)}
        />
      </label>
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
        Habilitado para recibir reservas
      </label>
      <BandsEditor bands={bands} setBands={setBands} capacity={capacity} />
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="admin-form-actions">
        <button type="button" className="secondary-button" disabled={busy} onClick={onCancel}>
          Cancelar
        </button>
        <button className="primary-button" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar alojamiento'}
        </button>
      </div>
    </form>
  );
}
export function AccommodationManager({
  initial,
  canManage,
}: {
  initial: AdminUnit[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(''),
    [message, setMessage] = useState('');
  const [active, setActive] = useState<{ unit: AdminUnit | null; mode: 'edit' | 'rates' } | null>(
    null,
  );
  const filtered = useMemo(
    () =>
      initial.filter((u) =>
        [u.name, u.code, u.type]
          .join(' ')
          .toLocaleLowerCase('es-AR')
          .includes(query.toLocaleLowerCase('es-AR')),
      ),
    [initial, query],
  );
  function saved() {
    setActive(null);
    setMessage('Alojamiento y tarifas actualizados.');
    router.refresh();
  }
  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <SearchField
          className="w-full max-w-[420px]"
          value={query}
          onChange={setQuery}
          placeholder="Buscar alojamiento"
        />
        {canManage && (
          <button
            type="button"
            className="primary-button"
            onClick={() => setActive({ unit: null, mode: 'edit' })}
          >
            Nuevo alojamiento
          </button>
        )}
      </div>
      {message && (
        <p role="status" className="mb-4 text-sm text-positive">
          {message}
        </p>
      )}
      <div className="overflow-x-auto rounded-2xl bg-cream-soft">
        <table className="admin-table min-w-[760px]">
          <thead>
            <tr>
              <th>Foto</th>
              <th>Alojamiento</th>
              <th>Tipo</th>
              <th>Capacidad</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((unit) => (
              <tr key={unit.id}>
                <td>
                  <Image
                    src={unit.image_url || '/images/logo-bahia-corral.png'}
                    alt={'Foto de ' + unit.name}
                    width={88}
                    height={64}
                    unoptimized
                    className="h-16 w-[88px] rounded-lg object-cover"
                  />
                </td>
                <td className="font-semibold">{unit.name}</td>
                <td>
                  {unit.type === 'CABIN'
                    ? 'Cabaña'
                    : unit.type === 'STUDIO'
                      ? 'Monoambiente'
                      : 'Habitación'}
                </td>
                <td>Hasta {unit.capacity_total} huéspedes</td>
                <td>
                  <span
                    className={
                      'status-pill ' +
                      (unit.operational_status === 'INACTIVE'
                        ? 'status-pill--pending'
                        : unit.published
                          ? 'status-pill--ready'
                          : 'status-pill--pending')
                    }
                  >
                    {unit.operational_status === 'INACTIVE'
                      ? 'Fuera de servicio'
                      : unit.published
                        ? 'Habilitado'
                        : 'Sin publicar'}
                  </span>
                </td>
                <td>
                  {canManage ? (
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        className="min-h-11 font-semibold hover:underline"
                        aria-label={'Editar ' + unit.name}
                        onClick={() => setActive({ unit, mode: 'edit' })}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="min-h-11 whitespace-nowrap font-semibold hover:underline"
                        aria-label={'Administrar tarifas de ' + unit.name}
                        onClick={() => setActive({ unit, mode: 'rates' })}
                      >
                        Administrar tarifas
                      </button>
                    </div>
                  ) : (
                    <span className="text-muted">Consulta</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <p className="p-9 text-center text-sm text-muted">No se encontraron alojamientos.</p>
        )}
      </div>
      <p className="mt-4 text-xs text-muted">{filtered.length} alojamientos</p>
      <AdminDialog
        open={active !== null}
        onOpenChange={(open) => {
          if (!open) setActive(null);
        }}
        title={
          active?.mode === 'rates'
            ? 'Tarifas de ' + active.unit?.name
            : active?.unit
              ? 'Editar alojamiento'
              : 'Nuevo alojamiento'
        }
        description={
          active?.mode === 'rates'
            ? 'Administrá los precios por ocupación de este alojamiento.'
            : 'Completá la información y las tarifas del alojamiento.'
        }
        wide
      >
        {active?.mode === 'rates' && active.unit ? (
          <RateEditor
            key={active.unit.id}
            unit={active.unit}
            onSaved={saved}
            onCancel={() => setActive(null)}
          />
        ) : (
          active && (
            <UnitEditor
              key={active.unit?.id ?? 'new'}
              unit={active.unit}
              onSaved={saved}
              onCancel={() => setActive(null)}
            />
          )
        )}
      </AdminDialog>
    </>
  );
}
