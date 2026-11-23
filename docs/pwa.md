# Installable AyosDito (PWA)

AyosDito can run as a website and an installed Android/Windows web app from the same HTTPS deployment and Supabase database. This implementation adds a web app manifest, branded regular/maskable PNG icons, Apple touch icon, a bilingual `/install` guide, browser-native install controls when available, and a public offline screen.

The website was published by the project owner at `https://ayosdito.vercel.app`. These local PWA changes still need to be committed/pushed to the repository connected to Vercel (or included in a new deployment) before that website gains the new features. No deployment was triggered by this implementation.

## Publish the update

1. Review changes in Source Control, including new `public/` icons/worker/offline document and all new PWA files. Commit and push to the branch connected to the Vercel production project, or deploy the updated project through the method used for the original publication. Do not upload `.env.local`, `test-results` or credentials.
2. Wait for Vercel to finish building successfully. No new environment variable, Supabase migration or additional dependency is needed for PWA support. Existing hosting/upload requirements still apply.
3. Open `https://ayosdito.vercel.app/install` over HTTPS. Check `/manifest.webmanifest`, `/sw.js`, `/offline.html` and all listed icon URLs return successfully. A production build is required for service-worker registration; `next dev` intentionally does not register it.
4. Test resident/admin login and uploads on the public host separately. The PWA does not change the existing evidence transport or provider body-size limits.

Install links are available on the login footer, resident/admin navigation and anonymous community header. The custom Install button appears only if the browser supplies a native installation event. If it does not appear, device-specific browser-menu instructions remain visible. A dismissed prompt is consumed once; the user may still install through their browser menu.

## Android

Open the permanent HTTPS website in Chrome. Use **Install AyosDito** if offered, or Chrome's menu → **Install app / Add to Home screen**, then confirm. Browser wording depends on device/version. Open the app icon and sign in with the existing account. Do not use the temporary development-tunnel URL as the app's permanent installation address.

## Windows

Open the permanent HTTPS website in Microsoft Edge or Chrome. Use its address-bar install icon or app installation menu, confirm, then open AyosDito from Start. Pin it to the taskbar if desired. The installed app opens in its own window; it still uses the browser's web-app runtime.

## iPhone/iPad

Open the website in Safari, choose Share → Add to Home Screen, then Add. Automatic install prompts are browser-dependent; manual instructions are included on the page.

## Connectivity, updates and privacy

- An internet connection is required for login, report submission, photos, status changes, confirmations and notifications. There is no offline report queue or background submission.
- The service worker caches **only `/offline.html`**, which is a self-contained English/Filipino connection screen with no account information. It never stores private reports, authenticated pages, API/Server Action responses, Supabase content or evidence in Cache Storage.
- Same-origin GET document navigations go to the network. Only a network failure returns the offline document. POSTs, RSC requests, assets and cross-origin traffic are not intercepted. Existing browser HTTP cache rules remain separate; private app responses retain their existing no-store protections.
- The offline page becomes available after the production site has been opened online and the worker has installed successfully. On a first-ever visit without connectivity, a browser error remains possible.
- App updates come from future website deployments. Worker updates do not force-reload active forms. When editing `public/offline.html`, also increment `CACHE_NAME` in `public/sw.js` so existing installations fetch the changed document. Activation deletes only older `ayosdito-offline-*` caches.
- This feature does not add push notifications, an APK/EXE, a Play Store listing or a Microsoft Store listing. Existing notifications remain in-app.

## Assets and local verification

The icons preserve the existing green map-pin brand. Regenerate them from `public/icons/ayosdito.svg` with:

```powershell
npm.cmd run pwa:icons
```

Run local tests and production-mode browser checks:

```powershell
npm.cmd test
$env:E2E_PRODUCTION = '1'
npm.cmd run test:e2e -- --grep PWA
Remove-Item Env:E2E_PRODUCTION
```

Production browser checks exercise manifest/icon dimensions, bilingual/mobile guidance, simulated native prompt acceptance/dismissal/failure, actual worker registration/control, cache contents, offline fallback and return online. Simulated native install events verify application behavior; they do not claim an actual Android home-screen or Windows Start installation. Complete those manual checks on the deployed HTTPS origin.

Relevant files: `src/app/manifest.ts`, `src/app/install/`, `src/components/pwa/`, `src/lib/i18n/pwa.ts`, `public/sw.js`, `public/offline.html`, `public/icons/`, `scripts/generate-pwa-icons.mjs`, root metadata, proxy exclusions and worker response headers.
