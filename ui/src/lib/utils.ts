import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function getDeviceInfo(): string | undefined {
  if (typeof window === 'undefined') return undefined;

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
