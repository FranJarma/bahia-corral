import { describe, expect, it } from 'vitest';

import {
  cancellationRefund,
  centsToMoney,
  moneyToCents,
  outstanding,
} from '@/modules/payments/domain/money';

describe('pagos y reintegros', () => {
  it('usa centavos exactos sin flotantes', () => {
    expect(moneyToCents('140000.50')).toBe(14000050n);
    expect(centsToMoney(14000050n)).toBe('140000.50');
    expect(() => moneyToCents('12.345')).toThrow();
  });
  it('trata el importe recibido y la deuda por separado', () => {
    expect(outstanding(40000000n, 25000000n, 0n)).toBe(15000000n);
  });
  it('calcula penalidad sólo sobre seña, no sobre el pago total', () => {
    expect(cancellationRefund(20000000n, 40000000n, 4)).toBe(30000000n);
    expect(cancellationRefund(20000000n, 40000000n, 10)).toBe(40000000n);
    expect(cancellationRefund(20000000n, 40000000n, 1)).toBe(20000000n);
  });
});
