# Bale Mini App Authentication

## Overview

Bale mini app auth allows users to log in to Mahanfile via the Bale messenger app without entering an OTP code. The flow uses Bale's `WebApp` SDK to share the user's phone number and authenticate via HMAC-signed init data.

## Architecture

```
Bale App WebView → /login?bale_miniapp=1 → BaleMiniAppLogin component
                        ↓
              useBaleMiniApp hook (initData + phone)
                        ↓
              POST /auth/bale-miniapp/auth (HMAC validation)
                        ↓
              AuthService.baleMiniAppAuth (user lookup/creation)
                        ↓
              JWT issued → redirect to /dashboard
```

## Files

### Backend (`server/src/`)

| File | Purpose |
| --- | --- |
| `modules/auth/auth.controller.ts` | `POST /auth/bale-miniapp/auth` endpoint |
| `modules/auth/auth.service.ts` | `baleMiniAppAuth()` — validates initData, finds/creates user, issues JWT |
| `modules/auth/dto/bale-miniapp-auth.dto.ts` | DTO with `initData`, `phone?`, `deviceId?`, `deviceName?`, `deviceType?`, `userAgent?` |
| `modules/bale/bale-miniapp-utils.ts` | `validateInitData()` — HMAC-SHA256 validation, `parseInitData()`, `formUrlDecode()` |
| `platform/config/security.config.ts` | CSP headers: `frame-ancestors https://*.bale.ai`, Bale SDK sources in `scriptSrc`/`connectSrc` |
| `main.ts` | `xFrameOptions: false` to allow Bale iframe embedding |

### Frontend (`ui/src/`)

| File | Purpose |
| --- | --- |
| `components/bale/bale-miniapp-login.tsx` | Full auth UI — initData validation, phone sharing, device confirmation, success redirect via `<Link>` |
| `hooks/use-bale-miniapp.ts` | Extracts initData from SDK (`window.Bale.WebApp.initData`) or URL hash, captures phone from `requestContact`, polls for SDK load |
| `types/bale-miniapp.d.ts` | TypeScript declarations for `BaleWebApp`, `BaleSdk`, `Window` |
| `app/login/page.tsx` | Server-side detection via `searchParams.bale_miniapp === '1'` |
| `features/api/endpoints/auth.ts` | `baleMiniAppAuth` RTK Query mutation with `phone?: string` |
| `features/auth/authSlice.ts` | `isBaleMiniApp` Redux state + `setBaleMiniApp` action |
| `components/auth/auth-initializer.tsx` | Restores `isBaleMiniApp` from `localStorage` via `useLayoutEffect` |
| `components/layout/site-header.tsx` | `MobileNavigationDrawer` hides logout in mini app |
| `components/layout/user-menu.tsx` | `UserMenu` hides logout in mini app |

## Auth Flow

### 1. Page Load

Server detects `?bale_miniapp=1` query param and renders `<BaleMiniAppLogin />`.

### 2. initData Extraction

`useBaleMiniApp` hook extracts initData:
1. First tries `window.Bale.WebApp.initData` (SDK — canonical source)
2. Falls back to raw URL hash extraction via `getRawHashParam('tgWebAppData')`
3. Polls every 200ms (up to 5s) for SDK to load, updates initData when found

### 3. Phone Sharing

User clicks "اشتراک‌گذاری شماره تماس" button:
1. SDK `requestContact(callback)` is called
2. Callback receives `(success, phoneNumber?)`
3. If SDK is a stub (`window.BaleWebApp`), falls back to `postEvent('web_app_request_phone')`

### 4. Authentication

`POST /auth/bale-miniapp/auth` with `{ initData, phone?, deviceInfo }`:

1. **validateInitData** — HMAC-SHA256 verification of init data against bot token
   - `formUrlDecode`: replaces `+` with space before `decodeURIComponent`
   - Checks `auth_date` freshness (max 86400s = 24h)
   - Uses `timingSafeEqual` for hash comparison
2. **Lookup BaleUserLink** — find existing link by `baleId` + `botId`
3. **Phone flow** — if no link but phone provided:
   - Fuzzy phone match (tries plain, digits-only, `+`-prefixed)
   - Creates new user if no match found
   - Upserts `BaleUserLink`
4. **Device check** — `findOrCreatePending` for device management
   - New device → `confirm_device` response (pending session token)
5. **JWT issue** — `buildAuthResponse` returns `accessToken`, `refreshToken`, `user`

### 5. Response Types

| Status | Meaning |
| --- | --- |
| `authenticated` | Success — tokens in response |
| `confirm_device` | New device — show confirmation dialog |
| `phone_required` | No phone, no existing link — user must share phone |

### 6. Navigation

Bale WebView blocks `window.location.href` and `router.push`. Uses ternary render:
- **Success**: clickable `<Link href="/dashboard">` (user-initiated `<a>` click works)
- **Login**: phone share button + status messages

## Device Management

- Device ID persisted in `localStorage` (`my-ads-device-id`), NOT cleared on logout
- `DEVICE_CHANGED` error thrown when `tokenVersion` in JWT doesn't match current version
- `confirm_device` flow asks user to approve new device
- WebSocket push notifies old device about challenger

## Mini App Detection (localStorage + Redux)

To hide UI elements (logout button, login links) when inside the Bale mini app:

1. **Set flag** — `BaleMiniAppLogin` sets `localStorage.setItem('my-ads-bale-miniapp', '1')` + dispatches `setBaleMiniApp(true)` to Redux in `useEffect`
2. **Restore on load** — `AuthInitializer` reads `my-ads-bale-miniapp` from localStorage in `useLayoutEffect` (fires before paint) and dispatches `setBaleMiniApp()`
3. **Read from Redux** — `MobileNavigationDrawer` and `UserMenu` read `s.auth.isBaleMiniApp` via `useAppSelector`
4. **Guard logout** — `{isAuthenticated && !isBaleMiniApp ? <LogoutButton /> : null}`

### Why not use `window.Bale?.WebApp` directly?

- Timing: SDK may not be loaded when components render
- Flash: `useState(false)` + `useEffect` causes visible flash
- SSR: `window` undefined on server

## Hydration Guard

`BaleMiniAppLogin` waits for `hydrated: true` (Redux) before rendering actual content to prevent server/client mismatch from persisted auth state:

```tsx
if (!hydrated) {
  return <LoadingCard />;
}
return redirected || accessToken ? <SuccessCard /> : <LoginCard />;
```

## HMAC Validation Details (`bale-miniapp-utils.ts`)

1. Parse raw init data string into params using `formUrlDecode`
2. Sort keys alphabetically (excluding `hash`)
3. Build data-check string: `key=value\nkey=value...`
4. Compute HMAC-SHA256:
   - Secret key: `HMAC-SHA256(botToken, "WebAppData")`
   - Signature: `HMAC-SHA256(secretKey, dataCheckString)`
5. Compare with received hash using `timingSafeEqual`
6. Verify `auth_date` is within `maxAgeSeconds` (default 24h for mini app)
