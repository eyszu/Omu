# Omu UI

The web client for the [Omu API](../omu): a soft, pastel, installable social app.

- **SolidJS**, plain **JavaScript** (`.js` / `.jsx`, no TypeScript anywhere)
- **Vite** build, `@solidjs/router`, code-split routes
- **PWA**: installable, offline app shell, cached feeds, update prompt (`vite-plugin-pwa` / Workbox)
- **Pastel theme**: lavender, pink, mint, sky and butter, with a matching dark "dusk" mode (automatic, or choose in Settings)
- No UI framework, no CSS framework: one hand-written stylesheet (~21 kB, 5 kB gzipped)

## Run it

You need Node 20+ and the Omu API running (default `http://localhost:3000`).

```sh
npm install
npm run dev          # http://localhost:5173, /api is proxied to the API
```

Production build, and a local preview of it (the service worker only runs in the built app):

```sh
npm run build
npm run preview      # http://localhost:4173
```

If your API is elsewhere, either set `OMU_API_PROXY=http://host:port` (dev/preview proxy) or build with
`VITE_API_URL=https://api.example.com` so the browser calls it directly (the API's `CORS_ORIGIN` must then allow your UI origin).
See `.env.example`.

## What's in it

| Screen | Route |
|---|---|
| Home timeline (people you follow) + composer | `/` |
| Explore (public timeline) | `/explore` |
| Log in / Sign up | `/login`, `/register` |
| Post thread with replies | `/post/:id` |
| Profile (posts, replies, likes), follow / unfollow | `/u/:username` |
| Followers / Following | `/u/:username/followers`, `/following` |
| Search posts and people, trending tags | `/search?q=`, `/tag/:tag` |
| Notifications with unread badge | `/notifications` |
| Bookmarks | `/bookmarks` |
| Settings: profile, theme, install, password, log out | `/settings` |

Also: infinite scroll with cursor pagination, optimistic like / repost / bookmark with rollback on failure,
#hashtag and @mention links, character counter (280), skeleton loaders, empty and error states,
responsive layout (3 columns, icon rail, or phone bottom-tab bar with a floating compose button),
keyboard focus rings, reduced-motion support.

## PWA notes

- **Installable**: web manifest with 192/512 icons and a maskable icon; an in-app "Install app" button appears where the browser allows it.
- **Offline**: the app shell is precached. API `GET`s use *network-first* (4 s timeout, 24 h cache), so you see the last-loaded feeds when offline, with an offline banner. Writes (post, like, ...) need a connection and show an error toast.
- **Updates**: `registerType: 'prompt'`. When a new build is deployed, a "new version ready, Reload" banner appears; nothing reloads under you.
- **Privacy**: cached API responses are personalised, so the `omu-api` cache is deleted on log out (and when a session expires).
- Service workers require **HTTPS** (or `localhost`). Your host must also rewrite unknown paths to `index.html` (SPA fallback) so deep links like `/u/alice` work on refresh.
- Replace the icons in `public/icons/` and `public/favicon.svg` to rebrand.

## Layout

```
index.html                 theme-color, iOS meta, no-flash theme bootstrap
vite.config.js             solid + PWA (manifest, Workbox caching) + dev/preview API proxy
public/                    favicon.svg, icons/
src/index.jsx, App.jsx     entry, routes (lazy-loaded pages)
src/lib/                   api.js (fetch wrapper), auth.js, theme.js, pwa.js, toast.js, modal.js, ...
src/components/            Layout, Feed (infinite list), PostCard, Composer, Avatar, Icon, ...
src/pages/                 one file per screen
src/styles/global.css      design tokens (light + dark pastel) and all styles
```
