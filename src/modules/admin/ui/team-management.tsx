'use client';
import { useState } from 'react';

import { ValidatedLabel } from '@/modules/shared-ui/validated-label';

export type MemberSummary = {
  id: string;
  email: string;
  role: 'OWNER' | 'STAFF' | 'CLEANING';
  active: boolean;
};

export function TeamManagement({ members }: { members: MemberSummary[] }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'STAFF' | 'CLEANING'>('STAFF');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function call(action: 'POST' | 'DELETE', body: Record<string, string>) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/team', {
        method: action,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await response.json()) as { error?: string; invitationUrl?: string };
      if (!response.ok) throw new Error(json.error ?? 'No se pudo completar la operación');
      setMessage(
        action === 'POST'
          ? 'Invitación generada. Se enviará al correo indicado.'
          : 'Acceso desactivado. Actualizá para ver los cambios.',
      );
      if (action === 'POST') setEmail('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible continuar');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="surface-card space-y-6 p-6">
      <h2 className="editorial text-2xl">Accesos del equipo</h2>
      <form
        className="grid gap-4 md:grid-cols-[1fr_200px_auto] md:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          void call('POST', { email, role });
        }}
      >
        <ValidatedLabel className="grid gap-2 text-sm font-semibold">
          Correo de la persona
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </ValidatedLabel>
        <label className="grid gap-2 text-sm font-semibold">
          Rol
          <select value={role} onChange={(event) => setRole(event.target.value as typeof role)}>
            <option value="STAFF">Personal administrativo</option>
            <option value="CLEANING">Limpieza</option>
          </select>
        </label>
        <button className="primary-button" disabled={busy}>
          Invitar
        </button>
      </form>
      {message && (
        <p role="status" className="text-sm text-brand">
          {message}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr>
              <th scope="col" className="py-3">
                Correo
              </th>
              <th scope="col">Rol</th>
              <th scope="col">Estado</th>
              <th scope="col" className="text-right">
                Acción
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr className="border-t border-[#e5e5de]" key={member.id}>
                <td className="py-3">{member.email}</td>
                <td>{member.role}</td>
                <td>{member.active ? 'Activo' : 'Inactivo'}</td>
                <td className="text-right">
                  {member.active && member.role !== 'OWNER' && (
                    <button
                      className="rounded px-3 py-2 text-sm font-semibold text-red-700 underline disabled:opacity-50"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`¿Desactivar el acceso de ${member.email}?`))
                          void call('DELETE', { membershipId: member.id });
                      }}
                    >
                      Desactivar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
