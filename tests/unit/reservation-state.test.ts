import { describe, expect, it } from 'vitest';

import { assertTransition, balanceDueAt } from '@/modules/reservations/domain/reservation-state';

describe('estados y vencimientos', () => {
  it('confirma, permite ingreso, salida y mantiene deuda por separado', () => {
    expect(() => assertTransition('PENDING_CONFIRMATION', 'CONFIRMED')).not.toThrow();
    expect(() => assertTransition('CONFIRMED', 'COMPLETED')).toThrow('Transición inválida');
    expect(() => assertTransition('CONFIRMED', 'IN_STAY')).not.toThrow();
    expect(() => assertTransition('IN_STAY', 'COMPLETED')).not.toThrow();
  });
  it('permite anular una reserva por confirmar sin habilitar cambios sobre reservas cerradas', () => {
    expect(() => assertTransition('PENDING_CONFIRMATION', 'CANCELLED')).not.toThrow();
    expect(() => assertTransition('CONFIRMED', 'CANCELLED')).not.toThrow();
    for (const status of ['IN_STAY', 'COMPLETED', 'NOT_COMPLETED', 'NO_SHOW'] as const) {
      expect(() => assertTransition(status, 'CANCELLED')).toThrow('Transición inválida');
    }
    expect(() => assertTransition('CANCELLED', 'CONFIRMED')).toThrow('Transición inválida');
  });
  it('distingue vencimiento del saldo al ingresar o 24 horas antes', () => {
    expect(balanceDueAt('2027-01-10', 'AT_CHECKIN')).toBe('2027-01-10T18:00:00.000Z');
    expect(balanceDueAt('2027-01-10', 'BEFORE_24H')).toBe('2027-01-09T18:00:00.000Z');
  });
});
