const DEVICE_ID_KEY = 'my-ads-device-id';

export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export function detectDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown';

  const ua = navigator.userAgent;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const width = window.innerWidth;

  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) return 'tablet';
  if (/Mobi|iPhone|Android.*Mobile/i.test(ua)) return 'mobile';
  if (width <= 768 && hasTouch) return 'tablet';
  return 'desktop';
}

export function getDeviceName(): string {
  if (typeof window === 'undefined') return '';

  const ua = navigator.userAgent;

  let browser = 'Unknown browser';
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    const match = ua.match(/Chrome\/([\d.]+)/);
    browser = `Chrome ${match?.[1] ?? ''}`;
  } else if (ua.includes('Firefox')) {
    const match = ua.match(/Firefox\/([\d.]+)/);
    browser = `Firefox ${match?.[1] ?? ''}`;
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    const match = ua.match(/Version\/([\d.]+)/);
    browser = `Safari ${match?.[1] ?? ''}`;
  } else if (ua.includes('Edg')) {
    const match = ua.match(/Edg\/([\d.]+)/);
    browser = `Edge ${match?.[1] ?? ''}`;
  }

  let os = 'Unknown OS';
  if (ua.includes('Windows NT 10')) os = 'Windows 10';
  else if (ua.includes('Windows NT 11')) os = 'Windows 11';
  else if (ua.includes('Mac OS X')) {
    const match = ua.match(/Mac OS X ([\d_]+)/);
    os = `macOS ${match?.[1].replace(/_/g, '.') ?? ''}`;
  } else if (ua.includes('Android')) {
    const match = ua.match(/Android ([\d.]+)/);
    os = `Android ${match?.[1] ?? ''}`;
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    const match = ua.match(/OS ([\d_]+)/);
    os = `iOS ${match?.[1].replace(/_/g, '.') ?? ''}`;
  } else if (ua.includes('Linux')) os = 'Linux';

  return `${browser} / ${os}`;
}

export function getDeviceInfo() {
  return {
    deviceId: getDeviceId(),
    deviceName: getDeviceName(),
    deviceType: detectDeviceType(),
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
  };
}

export function getDeviceDescription(name: string | null, type: string | null): string {
  const parts: string[] = [];
  if (type && type !== 'unknown') parts.push(type.charAt(0).toUpperCase() + type.slice(1));
  if (name && name.length > 0) parts.push(name);
  return parts.length > 0 ? parts.join(' · ') : 'Unknown device';
}
