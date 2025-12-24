const STORAGE_HOSTS = new Set([
  'storage.mahanfile.com',
  'dev-storage.mahanfile.com',
  'mahan-storage.toncloud.observer',
]);

const normalizeBase = (value: string): string => value.replace(/\/$/, '');

const buildStorageBase = (appBase?: string): string => {
  if (!appBase) return '/storage';
  return `${normalizeBase(appBase)}/storage`;
};

export const normalizeStorageUrl = (
  value?: string | null,
  appBase?: string,
): string | undefined => {
  if (!value) return undefined;
  if (value.startsWith('/storage/')) return value;

  try {
    const parsed = new URL(value);
    if (STORAGE_HOSTS.has(parsed.hostname)) {
      return `${buildStorageBase(appBase)}${parsed.pathname}`;
    }
    return value;
  } catch {
    if (value.startsWith('/mahan-file-uploads/')) {
      return `${buildStorageBase(appBase)}${value}`;
    }
    return value;
  }
};

export const normalizeStorageHtml = (html: string, appBase?: string): string => {
  const storageBase = buildStorageBase(appBase);
  return html.replace(
    /(https?:\/\/)(dev-storage\.mahanfile\.com|storage\.mahanfile\.com|mahan-storage\.toncloud\.observer)/gi,
    storageBase,
  );
};
