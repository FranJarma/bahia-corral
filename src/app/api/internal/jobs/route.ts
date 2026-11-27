import { timingSafeEqual } from 'node:crypto';

import { type NextRequest, NextResponse } from 'next/server';

import { dispatchDefaultTenant } from '@/infrastructure/jobs/outbox';

export async function POST(request: NextRequest) {
  const configured = process.env.JOB_WEBHOOK_SECRET;
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/, '') ?? '';
  if (
    !configured ||
    Buffer.byteLength(configured) !== Buffer.byteLength(provided) ||
    !timingSafeEqual(Buffer.from(configured), Buffer.from(provided))
  )
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  return NextResponse.json({ dispatched: await dispatchDefaultTenant() });
}
