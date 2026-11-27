import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

let driver: ReturnType<typeof postgres> | undefined;

export function getSqlClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no está configurada para este ambiente');
  }
  driver ??= postgres(process.env.DATABASE_URL, { max: 5, prepare: false, idle_timeout: 20 });
  return driver;
}

export function getDatabase() {
  return drizzle(getSqlClient());
}
