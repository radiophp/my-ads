import { registerAs } from '@nestjs/config';

export type PushConfig = {
  vapidPublicKey: string | null;
  vapidPrivateKey: string | null;
  subject: string | null;
  timeoutMs: number;
};

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export default registerAs<PushConfig>('push', () => {
  const vapidPublicKey = process.env['VAPID_PUBLIC_KEY'] ?? null;
  const vapidPrivateKey = process.env['VAPID_PRIVATE_KEY'] ?? null;
  const subject = process.env['VAPID_SUBJECT'] ?? 'mailto:admin@example.com';
  const timeoutMs = toNumber(process.env['PUSH_NOTIFICATION_TIMEOUT_MS'], 8000);

  return {
    vapidPublicKey,
    vapidPrivateKey,
    subject,
    timeoutMs,
  };
});
