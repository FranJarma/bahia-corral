import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { ReservationSummary } from '@/modules/reservations/application/list-reservations';
import { ReservationDetails } from '@/modules/reservations/ui/reservation-details';

// El router requiere el contexto de Next.js; se renderizan los componentes reales.
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));

const reservation: ReservationSummary = {
  id: '00000000-0000-4000-8000-000000000001',
  reference: 'BC-TEST-ANULADA',
  guest_name: 'Persona de prueba',
  guest_phone: '3870000000',
  unit_name: 'Cabaña ficticia',
  checkin: '2030-01-10',
  checkout: '2030-01-11',
  status: 'CANCELLED',
  amount_cents: '14000000',
  paid_cents: '1000000',
};

describe('Resumen financiero de una reserva anulada', () => {
  it('conserva el importe abonado sin presentarlo como una deuda exigible', () => {
    const html = renderToStaticMarkup(createElement(ReservationDetails, { reservation }));
    expect(html).toContain('Cancelada');
    expect(html).toContain('Importe abonado');
    expect(html).toContain('10.000');
    expect(html).toContain('cualquier devolución se gestiona por separado');
    expect(html).not.toContain('Saldo pendiente');
    expect(html).not.toContain('Anular reserva');
    expect(html).not.toContain('Confirmar sin seña');
  });
  it('mantiene el saldo pendiente en una reserva confirmada', () => {
    const html = renderToStaticMarkup(
      createElement(ReservationDetails, {
        reservation: { ...reservation, status: 'CONFIRMED' },
      }),
    );
    expect(html).toContain('Saldo pendiente');
    expect(html).toContain('130.000');
  });
});

it('muestra el importe devuelto y el neto recibido sin perder los centavos', () => {
  const html = renderToStaticMarkup(
    createElement(ReservationDetails, {
      reservation: Object.assign({}, reservation, {
        amount_cents: '1000000',
        paid_cents: '1000000',
        refunded_cents: '1',
      }),
    }),
  );
  expect(html).toContain('Importe devuelto');
  expect(html).toContain('0,01');
  expect(html).toContain('Neto recibido');
  expect(html).toContain('9.999,99');
  expect(html).not.toContain('Saldo pendiente');
});
