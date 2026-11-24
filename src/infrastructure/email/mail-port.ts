import 'server-only';

import { Resend } from 'resend';

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  idempotencyKey?: string;
};
export type MailPort = { send(message: MailMessage): Promise<{ providerId: string }> };

export function createResendMailPort(): MailPort {
  return {
    async send(message) {
      if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
        throw new Error('Resend no está configurado. No se simuló ningún envío.');
      }
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data, error } = await resend.emails.send(
        {
          from: process.env.RESEND_FROM_EMAIL,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
        },
        message.idempotencyKey ? { idempotencyKey: message.idempotencyKey } : undefined,
      );
      if (error || !data?.id) throw new Error('No fue posible enviar el correo');
      return { providerId: data.id };
    },
  };
}

export async function sendMail(message: MailMessage) {
  return createResendMailPort().send(message);
}
