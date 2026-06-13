# Audit & Security Notes

## Status (2026-06-13)

| Project | Initial Vulns | Fixed | Remaining | Status |
|---------|:---:|:-----:|:---------:|:------:|
| Server | 58 (3C, 22H, 33M) | 58 | **0** | Clean |
| UI (prod) | 23 (2C, 9H, 12M) | 20 | **3 moderate** | Two deferred |

## Remaining Vulnerabilities (deferred)

### 1. next-intl — moderate (open redirect + prototype pollution)
- **Package:** `next-intl` 3.26.5
- **Advisories:** GHSA-8f24-v5vv-gm5j, GHSA-4c35-wcg5-mm9h
- **Fix:** Upgrade to `next-intl@4.13.0` (breaking — v3 → v4)
- **Why deferred:** 90+ files affected (plugin, navigation, server/client APIs all changed in v4). Needs dedicated migration session with full testing.
- **Mitigation:** `experimental.messages.precompile` is not enabled (prototype pollution vector not active). Open redirect risk is low (requires attacker-controlled redirect destination).

### 2. postcss — moderate (XSS via unescaped `</style>`)
- **Package:** Bundled inside `next` 16.2.9 (`next/node_modules/postcss`)
- **Advisory:** GHSA-qx2v-qp2m-jg93
- **Fix:** Upgrade `next` to 16.3.0+ (when released with postcss 8.5.10+)
- **Why deferred:** Blocked on Next.js release. Cannot fix independently.

### 3. Dev-only vulns (storybook, vitest, elliptic)
- 15 moderate+ devDependency vulns remain (storybook, vitest, esbuild, elliptic, uuid, etc.)
- These are **build-time only** — not present in production bundles
- Fix by upgrading storybook/vitest in a future dev-exp sprint

## Summary
- Production runtime vulns: **0 critical, 0 high, 3 moderate (deferred)**
- Server: **completely clean**
- UI: **safe to deploy** with two accepted moderate-risk items
