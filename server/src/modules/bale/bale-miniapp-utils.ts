import { createHmac, timingSafeEqual } from 'node:crypto';

export type WebAppUser = {
  id: number;
  first_name?: string;
  username?: string;
  allows_write_to_pm?: boolean;
  photo_url?: string;
};

export type WebAppInitData = {
  query_id?: string;
  user?: WebAppUser;
  auth_date: number;
  hash: string;
};

const formUrlDecode = (s: string): string => decodeURIComponent(s.replace(/\+/g, ' '));

const parseSearchParams = (raw: string): Record<string, string> => {
  const params: Record<string, string> = {};
  for (const part of raw.split('&')) {
    const eq = part.indexOf('=');
    if (eq === -1) {
      params[formUrlDecode(part)] = '';
    } else {
      const key = formUrlDecode(part.slice(0, eq));
      const value = formUrlDecode(part.slice(eq + 1));
      params[key] = value;
    }
  }
  return params;
};

export const parseInitData = (raw: string): WebAppInitData => {
  const params = parseSearchParams(raw);
  const parsed: Record<string, unknown> = { ...params };
  if (params['user']) {
    try {
      parsed['user'] = JSON.parse(params['user']);
    } catch {
      throw new Error('Invalid user JSON in initData');
    }
  }
  if (params['auth_date']) {
    parsed['auth_date'] = Number(params['auth_date']);
  }
  return parsed as unknown as WebAppInitData;
};

export const validateInitData = (
  raw: string,
  botToken: string,
  maxAgeSeconds = 300,
): WebAppInitData | null => {
  try {
    const data = parseInitData(raw);

    if (!data.hash || !data.auth_date) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (now - data.auth_date > maxAgeSeconds) {
      return null;
    }

    const sortedKeys = Object.keys(data)
      .filter((k) => k !== 'hash')
      .sort();

    const dataCheckString = sortedKeys
      .map((key) => {
        const val = data[key as keyof WebAppInitData];
        return `${key}=${typeof val === 'object' ? JSON.stringify(val) : String(val)}`;
      })
      .join('\n');

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();

    const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const receivedHash = data.hash;

    if (computedHash.length !== receivedHash.length) {
      return null;
    }

    const valid = timingSafeEqual(Buffer.from(computedHash), Buffer.from(receivedHash));

    if (!valid) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
};
