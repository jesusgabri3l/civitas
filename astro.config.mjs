import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vue from '@astrojs/vue';

export default defineConfig({
  site: 'https://civitas.pages.dev',
  integrations: [vue(), sitemap({ serialize: (item) => ({ ...item, url: item.url.replace(/(.)\/$/, '$1') }) })],
  devToolbar: { enabled: false },
  vite: {
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
