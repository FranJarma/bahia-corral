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
