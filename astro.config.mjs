import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

export default defineConfig({
  site: 'https://civitas.pages.dev',
  integrations: [vue()],
  devToolbar: { enabled: false },
  vite: {
    build: { chunkSizeWarningLimit: 1200 },
  },
});
