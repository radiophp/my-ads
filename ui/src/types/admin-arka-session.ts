export type AdminArkaSession = {
  id: string;
  label: string;
  headersRaw: string;
  headers: Record<string, string>;
  active: boolean;
  locked: boolean;
  lastError: string | null;
  lastErrorAt: string | null;
  createdAt: string;
  updatedAt: string;
};
