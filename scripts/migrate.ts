import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import postgres from 'postgres';

async function main() {
  const connectionString = process.env.DATABASE_MIGRATION_URL;
  if (!connectionString) throw new Error('DATABASE_MIGRATION_URL requerido para migraciones');
  const client = postgres(connectionString, { max: 1, prepare: false });
  try {
    const migrations = ['0001-initial.sql', '0002-username-login.sql'];
    for (const filename of migrations) {
      const raw = readFileSync(resolve(process.cwd(), 'drizzle', filename), 'utf8');
      await client.unsafe(raw);
      console.info(`Migración verificada: ${filename}`);
    }
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
