import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vue from '@astrojs/vue';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://visitcivitas.com',
  // Everything stays prerendered; only `src/pages/api/suggest.ts` runs as a function.
  adapter: vercel(),
  // English at the root, Spanish under /es (slugs stay in English: /es/rome). Docs: docs/i18n-plan.md.
  i18n: { locales: ['en', 'es'], defaultLocale: 'en', routing: { prefixDefaultLocale: false } },
  integrations: [vue(), sitemap({ i18n: { defaultLocale: 'en', locales: { en: 'en', es: 'es' } }, serialize: (item) => ({ ...item, url: item.url.replace(/(.)\/$/, '$1') }) })],
  devToolbar: { enabled: false },
  vite: {
    // The cities load on demand: without this, dev discovers these deep imports on the first trip, re-optimizes mid-session
    // and the import in flight fails with 504 (Outdated Optimize Dep).
    optimizeDeps: {
      include: [
        'three',
        'three/examples/jsm/geometries/RoundedBoxGeometry.js',
        'three/examples/jsm/postprocessing/Pass.js',
        'gsap',
        'gsap/ScrollTrigger',
      ],
    },
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          // three in its own chunk: it barely changes between deploys, so returning visitors keep it cached.
          manualChunks: (id) => (id.includes('/node_modules/three/') ? 'three' : undefined),
        },
      },
    },
  },
});
