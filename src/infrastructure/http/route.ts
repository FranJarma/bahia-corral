import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function assertTrustedOrigin(request: NextRequest): void {
  const origin = request.headers.get('origin');
  if (!origin || origin !== request.nextUrl.origin) throw new Error('Origen de solicitud inválido');
}
export async function jsonInput<T>(
  request: NextRequest,
  schema: { parse(data: unknown): T },
): Promise<T> {
  const raw = await request.json();
  return schema.parse(raw);
}
export function failResponse(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: 'Datos inválidos',
        issues: error.issues.map((e) => ({ path: e.path.join('.'), message: e.message })),
      },
      { status: 400 },
    );
  if (error instanceof Error) {
    if (/(Origen|autorizado|permiso)/i.test(error.message))
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    if (
      /(Bloqueo|disponible|superpuest|capacidad|seña|tarifa|fecha|Email|correo|ingreso)/i.test(
        error.message,
      )
    )
      return NextResponse.json({ error: error.message }, { status: 409 });
  }
  console.error('Fallo de operación', {
    message: error instanceof Error ? error.message : 'unknown',
  });
  return NextResponse.json(
    { error: 'No pudimos completar la operación. Intentá nuevamente.' },
    { status: 500 },
  );
}
export function successJson(value: Record<string, unknown>, status = 200) {
  return NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}
