import { describe, expect, it, vi } from 'vitest';

import { failResponse } from '@/infrastructure/http/route';

describe('errores públicos de operaciones', () => {
  it('no devuelve consultas ni contactos internos cuando falla PostgreSQL', async () => {
    const silence = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = failResponse(
        new Error(
          'Failed query: UPDATE guests SET email=$1\nparams: private@example.com,checkout-token-private',
        ),
      );
      expect(response.status).toBe(500);
      const body = JSON.stringify(await response.json());
      expect(body).not.toContain('private@example.com');
      expect(body).not.toContain('checkout-token-private');
      expect(body).not.toContain('UPDATE guests');
    } finally {
      silence.mockRestore();
    }
  });
});

it('informa falta de disponibilidad cuando PostgreSQL rechaza una superposición', async () => {
  const provider = Object.assign(new Error('private database details'), {
    code: '23P01',
    constraint_name: 'no_inventory_overlap',
  });
  const error = new Error(
    'Failed query: INSERT INTO inventory_allocations\nparams: private@example.com',
    { cause: new Error('Query wrapper', { cause: provider }) },
  );
  const silence = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const response = failResponse(error);
    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.code).toBe('ACCOMMODATION_UNAVAILABLE');
    expect(data.error).toMatch(/no está disponible/);
    expect(data.error).toMatch(/fechas/);
    expect(JSON.stringify(data)).not.toContain('private');
  } finally {
    silence.mockRestore();
  }
});

it('mantiene privados los errores de otras restricciones de PostgreSQL', async () => {
  const error = new Error('Failed query: INSERT INTO dated_rates\nparams: private@example.com', {
    cause: Object.assign(new Error('private details'), {
      code: '23P01',
      constraint_name: 'no_dated_rate_overlap',
    }),
  });
  const silence = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const response = failResponse(error);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.code).not.toBe('ACCOMMODATION_UNAVAILABLE');
    expect(JSON.stringify(data)).not.toContain('private');
    expect(JSON.stringify(data)).not.toContain('dated_rates');
  } finally {
    silence.mockRestore();
  }
});
