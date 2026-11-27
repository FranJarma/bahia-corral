import { toNextJsHandler } from 'better-auth/next-js';

import { getAuth } from '@/modules/identity-access/application/auth';

export const dynamic = 'force-dynamic';

// Create the DB-backed adapter only when processing a request. The build step
// and static route discovery must never depend on preview/production secrets.
export async function GET(request: Request): Promise<Response> {
  return toNextJsHandler(getAuth()).GET(request);
}

export async function POST(request: Request): Promise<Response> {
  return toNextJsHandler(getAuth()).POST(request);
}
