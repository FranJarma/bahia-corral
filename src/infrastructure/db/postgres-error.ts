export type PostgresErrorInfo = { code: string; constraint?: string };

/** Extrae únicamente metadatos seguros, incluso si Drizzle envuelve el error. */
export function getPostgresErrorInfo(error: unknown): PostgresErrorInfo | null {
  let current = error;
  for (let depth = 0; depth < 8; depth++) {
    if (typeof current !== 'object' || current === null) return null;
    if (
      'code' in current &&
      typeof current.code === 'string' &&
      /^[0-9A-Z]{5}$/.test(current.code)
    ) {
      const name = 'constraint_name' in current ? current.constraint_name : undefined;
      return {
        code: current.code,
        ...(typeof name === 'string' && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
          ? { constraint: name }
          : {}),
      };
    }
    current = 'cause' in current ? current.cause : undefined;
  }
  return null;
}
