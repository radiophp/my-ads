import { registerAs } from '@nestjs/config';

export type PushConfig = {
  vapidPublicKey: string | null;
  vapidPrivateKey: string | null;
  subject: string | null;
};

export default registerAs<PushConfig>('push', () => {
  const vapidPublicKey = process.env['VAPID_PUBLIC_KEY'] ?? null;
  const vapidPrivateKey = process.env['VAPID_PRIVATE_KEY'] ?? null;
  const subject = process.env['VAPID_SUBJECT'] ?? 'mailto:admin@example.com';

  return {
    vapidPublicKey,
    vapidPrivateKey,
    subject,
  };
});
