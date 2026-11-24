import { describe, expect, it } from 'vitest';

import {
  holdExpiresAt,
  shouldReleaseHold,
  verificationDeadline,
} from '@/modules/availability/domain/holds';

describe('Holds', () => {
  it('define 10+5 minutos y no libera un cobro en proceso o incierto', () => {
    const start = new Date('2027-02-01T17:00:00Z');
    expect(holdExpiresAt(start).toISOString()).toBe('2027-02-01T17:10:00.000Z');
    expect(verificationDeadline(start).toISOString()).toBe('2027-02-01T17:15:00.000Z');
    expect(
      shouldReleaseHold(
        { status: 'ACTIVE', expiresAt: holdExpiresAt(start), paymentStartedAt: null },
        new Date('2027-02-01T17:11:00Z'),
      ),
    ).toBe(true);
    expect(
      shouldReleaseHold(
        { status: 'VERIFYING', expiresAt: holdExpiresAt(start), paymentStartedAt: start },
        new Date('2027-02-01T17:20:00Z'),
      ),
    ).toBe(false);
    expect(
      shouldReleaseHold(
        { status: 'UNCERTAIN', expiresAt: holdExpiresAt(start), paymentStartedAt: start },
        new Date('2027-02-01T19:00:00Z'),
      ),
    ).toBe(false);
  });
});
