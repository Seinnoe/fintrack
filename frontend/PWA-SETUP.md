# FinTrack PWA

FinTrack is configured as an installable Progressive Web App (PWA).

## What was added

- `public/manifest.webmanifest`: app name, standalone display mode, theme and icons.
- `public/sw.js`: service worker for the app shell and same-origin static assets.
- `public/icons/`: 192px, 512px and maskable app icons.
- `index.html`: mobile/PWA metadata, manifest and iOS home-screen icon.
- `src/main.tsx`: production-only service-worker registration.

The existing React UI, API calls, backend and database configuration are unchanged.

## Build and deploy

From `frontend/` run:

```bash
npm ci
npm run build
```

Deploy the updated frontend to the existing HTTPS Render Static Site. The service worker is registered only in production, not in the Vite development server.

## Install on a phone

- Android: open the deployed FinTrack URL in Chrome, then use **Install app** or **Add to Home screen** from the browser menu.
- iPhone/iPad: open the deployed URL in Safari, tap **Share**, then **Add to Home Screen**.

PWA installation requires HTTPS (Render's `onrender.com` site already uses HTTPS).

## Offline behavior and privacy

The service worker caches the app shell and same-origin static assets so the interface can reopen after it has been visited online. It deliberately does **not** cache `/api/` requests, authentication responses, or financial data. Login, syncing, and all backend/database features still require an internet connection. This is not a full offline-first finance app.
