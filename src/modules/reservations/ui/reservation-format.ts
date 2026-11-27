export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  PENDING_CONFIRMATION: 'Por Confirmar',
  CONFIRMED: 'Confirmada',
  IN_STAY: 'En estadía',
  COMPLETED: 'Finalizada',
  CANCELLED: 'Cancelada',
  NOT_COMPLETED: 'No completada',
  NO_SHOW: 'No se presentó',
};
export function reservationStatusLabel(status: string) {
  return RESERVATION_STATUS_LABELS[status] ?? 'Estado no disponible';
}
export function formatReservationMoney(value: string) {
  const cents = BigInt(value),
    absolute = cents < 0n ? -cents : cents;
  const whole = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(absolute / 100n);
  return (
    (cents < 0n ? '-' : '') +
    whole +
    (absolute % 100n ? ',' + String(absolute % 100n).padStart(2, '0') : '')
  );
}
export function formatReservationDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value + 'T12:00:00Z'));
}
