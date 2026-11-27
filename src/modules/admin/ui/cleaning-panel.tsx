'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type Unit = { unit_id: string; name: string; status: 'PENDING' | 'IN_PROGRESS' | 'READY' };
const statusCopy = {
  PENDING: 'Pendiente de limpieza',
  IN_PROGRESS: 'En limpieza',
  READY: 'Limpio',
} as const;
export function CleaningPanel() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  async function refresh() {
    const response = await fetch('/api/admin/housekeeping', { cache: 'no-store' });
    const data = (await response.json()) as { units?: Unit[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? 'No se pudo cargar la limpieza');
    setUnits(data.units ?? []);
  }
  useEffect(() => {
    queueMicrotask(() => {
      void refresh().catch(() => setMessage('No pudimos cargar las unidades.'));
    });
  }, []);
  async function change(id: string, status: Unit['status']) {
    setBusy(id);
    setMessage('');
    try {
      const response = await fetch('/api/admin/housekeeping', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId: id, status }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Error al actualizar la limpieza');
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No pudimos actualizar el estado');
    } finally {
      setBusy('');
    }
  }
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-semibold">Coordinación de limpieza de las seis unidades</span>
        <div className="flex gap-2">
          <Link href="/admin/recepcion" className="secondary-button">
            Ir a Recepción <ArrowRight size={15} />
          </Link>
        </div>
      </div>
      {message && (
        <p role="alert" className="my-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
          {message}
        </p>
      )}
      <div className="overflow-x-auto rounded-2xl bg-cream-soft">
        <table className="admin-table min-w-[660px]">
          <thead>
            <tr>
              <th>Alojamiento</th>
              <th>Próximo movimiento</th>
              <th>Limpieza</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => (
              <tr key={unit.unit_id}>
                <td className="font-semibold">{unit.name}</td>
                <td className="text-muted">Consultar movimientos en Recepción</td>
                <td>
                  <span
                    className={`status-pill ${unit.status === 'READY' ? 'status-pill--ready' : 'status-pill--pending'}`}
                  >
                    {statusCopy[unit.status]}
                  </span>
                </td>
                <td>
                  {unit.status === 'PENDING' ? (
                    <button
                      disabled={busy === unit.unit_id}
                      onClick={() => void change(unit.unit_id, 'IN_PROGRESS')}
                      className="primary-button !min-h-10"
                    >
                      Iniciar limpieza <ArrowRight size={14} />
                    </button>
                  ) : unit.status === 'IN_PROGRESS' ? (
                    <button
                      disabled={busy === unit.unit_id}
                      onClick={() => void change(unit.unit_id, 'READY')}
                      className="primary-button !min-h-10"
                    >
                      Marcar listo <ArrowRight size={14} />
                    </button>
                  ) : (
                    <button
                      disabled={busy === unit.unit_id}
                      onClick={() => void change(unit.unit_id, 'PENDING')}
                      className="tertiary-button !min-h-10"
                    >
                      Marcar pendiente
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!units.length && (
          <p className="p-10 text-center text-sm text-muted">Sin unidades cargadas.</p>
        )}
      </div>
      <p className="mt-5 text-[11px] leading-5 text-muted">
        El estado de limpieza no modifica las fechas de las reservas. Los bloqueos de mantenimiento
        se gestionan por separado.
      </p>
    </div>
  );
}
