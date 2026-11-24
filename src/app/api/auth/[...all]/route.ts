import { toNextJsHandler } from 'better-auth/next-js';

import { getAuth } from '@/modules/identity-access/application/auth';

const handler = toNextJsHandler(getAuth());
export const { GET, POST } = handler;
