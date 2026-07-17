import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://hillindigo.cc.cd',
  integrations: [react(), mdx(), sitemap()],
  output: 'static',
  markdown: { shikiConfig: { theme: 'github-dark-dimmed', wrap: true } },
});
