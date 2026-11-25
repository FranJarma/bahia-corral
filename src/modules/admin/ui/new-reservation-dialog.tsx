'use client';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { NewReservationForm } from '@/modules/admin/ui/new-reservation-form';
import { AdminDialog } from '@/modules/shared-ui/admin-dialog';

export function NewReservationDialog({ label = 'Nueva reserva', secondary = false, onCreated }: {
  label?: string; secondary?: boolean; onCreated?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  return <div>
    <button type="button" className={secondary ? 'secondary-button' : 'primary-button'} onClick={() => setOpen(true)}>
      {label}{!secondary && <ArrowRight size={16} aria-hidden="true" />}
    </button>
    {message && <p role="status" className="mt-3 text-xs text-positive">{message}</p>}
    <AdminDialog open={open} onOpenChange={setOpen} title="Nueva reserva" description="Registrá una reserva recibida por teléfono o en recepción.">
      {open && <NewReservationForm onCancel={() => setOpen(false)} onSuccess={reference => {
        setOpen(false);
        setMessage(reference ? 'Reserva '+reference+' creada correctamente.' : 'Reserva creada correctamente.');
        router.refresh();
        onCreated?.();
      }} />}
    </AdminDialog>
  </div>;
}
