import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vue from '@astrojs/vue';

export default defineConfig({
  site: 'https://civitas.pages.dev',
  integrations: [vue(), sitemap({ serialize: (item) => ({ ...item, url: item.url.replace(/(.)\/$/, '$1') }) })],
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
