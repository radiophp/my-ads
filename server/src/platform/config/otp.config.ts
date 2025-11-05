import { registerAs } from '@nestjs/config';

export interface OtpConfig {
  ttlSeconds: number;
  digits: number;
  sender: {
    baseUrl: string | null;
    apiKey?: string;
  };
}

export default registerAs('otp', (): OtpConfig => {
  const ttl = process.env['OTP_TTL_SECONDS'];
  const digits = process.env['OTP_DIGITS'];
  const baseUrl = process.env['OTP_SENDER_BASE_URL'];
  const apiKey = process.env['OTP_SENDER_API_KEY'];

  return {
    ttlSeconds: Number.parseInt(ttl ?? '300', 10),
    digits: Number.parseInt(digits ?? '6', 10),
    sender: {
      baseUrl: baseUrl ?? null,
      apiKey: apiKey ?? undefined,
    },
  } satisfies OtpConfig;
});
