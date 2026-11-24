import 'server-only';

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { getDatabase } from '@/infrastructure/db/client';
import { sendMail } from '@/infrastructure/email/mail-port';
import * as authSchema from '@/modules/identity-access/data/auth-schema';

let singleton: ReturnType<typeof betterAuth> | undefined;
export function getAuth() {
  if (!singleton) {
    singleton = betterAuth({
      baseURL: process.env.BETTER_AUTH_URL,
      secret: process.env.BETTER_AUTH_SECRET,
      database: drizzleAdapter(getDatabase(), { provider: 'pg', schema: authSchema }),
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        sendResetPassword: async ({ user, url }) => {
          await sendMail({
            to: user.email,
            subject: 'Recuperá el acceso a Bahía Corral',
            html: `<p>Para recuperar el acceso, usá el enlace de un solo uso:</p><p><a href="${url}">Restablecer contraseña</a></p>`,
          });
        },
      },
      emailVerification: {
        sendVerificationEmail: async ({ user, url }) => {
          await sendMail({
            to: user.email,
            subject: 'Verificá tu correo de Bahía Corral',
            html: `<p>Confirmá tu correo ingresando en el siguiente enlace:</p><p><a href="${url}">Verificar correo</a></p>`,
          });
        },
      },
      session: { expiresIn: 30 * 24 * 60 * 60, updateAge: 0 },
      advanced: { disableCSRFCheck: false },
    });
  }
  return singleton;
}
