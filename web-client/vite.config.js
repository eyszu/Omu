import { defineConfig, loadEnv } from 'vite'
import solid from 'vite-plugin-solid'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // In dev and `vite preview`, /api is proxied to the Omu API so no CORS or env setup is needed.
  const proxy = { '/api': { target: env.OMU_API_PROXY || 'http://localhost:3000', changeOrigin: true } }

  return {
    plugins: [
      solid(),
      VitePWA({
        registerType: 'prompt', // we show an "update available" toast instead of reloading silently
        includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'Omu',
          short_name: 'Omu',
          description: 'A soft, pastel little corner of the internet. Say something.',
          lang: 'en',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait-primary',
          background_color: '#fbf7ff',
          theme_color: '#b9a6ff',
          categories: ['social'],
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          shortcuts: [
            { name: 'Notifications', url: '/notifications', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
            { name: 'Explore', url: '/explore', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              // Read-only API calls: fresh when online, last-seen data when offline.
              urlPattern: ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/v1/'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'omu-api',
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 },
                cacheableResponse: { statuses: [200] },
              },
            },
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'omu-images',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 14 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
  }
})
