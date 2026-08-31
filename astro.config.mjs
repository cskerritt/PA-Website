import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://purintonanalytics.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
