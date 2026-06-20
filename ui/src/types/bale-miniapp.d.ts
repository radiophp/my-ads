interface BaleWebAppUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

interface BaleWebAppInitData {
  query_id?: string;
  user?: BaleWebAppUser;
  auth_date: number;
  hash: string;
  start_param?: string;
}

interface BackButton {
  show(): void;
  hide(): void;
  onClick(callback: () => void): void;
  offClick(callback: () => void): void;
  isVisible: boolean;
}

interface BaleWebApp {
  initData: string;
  initDataUnsafe: BaleWebAppInitData;
  colorScheme: string;
  themeParams: Record<string, string>;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  ready(): void;
  expand(): void;
  close(): void;
  requestContact(callback: (success: boolean, phoneNumber?: string) => void): boolean | undefined;
  postEvent(eventType: string, data?: string): void;
  onEvent(eventType: string, callback: (...args: unknown[]) => void): void;
  offEvent(eventType: string, callback: (...args: unknown[]) => void): void;
  sendData(data: string): void;
  openLink(url: string, options?: { try_instant_view?: boolean }): void;
  version: string;
  BackButton: BackButton;
}

interface BaleSdk {
  WebApp: BaleWebApp;
  receiveEvent: (eventType: string, eventData: unknown) => boolean | void;
}

declare global {
  interface Window {
    BaleWebApp?: { postEvent(eventType: string, data?: string): void; ready?(): void };
    Bale?: BaleSdk;
  }
}

export {};
