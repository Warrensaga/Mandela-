import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import vercelConfig from './vercel.json';
import { CATEGORY_KEYWORDS } from './src/lib/seoKeywords';

// Node's process.env (this project does not install @types/node).
declare const process: { env: Record<string, string | undefined> };

// Canonical links, the sitemap and link previews all use VITE_SITE_URL. If it
// is missing or not a plain https://domain value, production builds on Vercel
// fall back to the project's production domain, so every address (www, bare,
// *.vercel.app) still points search engines at one site. Set before Vite reads
// the environment, so import.meta.env.VITE_SITE_URL sees the same value.
{
  const configured = (process.env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '');
  const production = process.env.VERCEL_ENV === 'production' ? process.env.VERCEL_PROJECT_PRODUCTION_URL : '';
  if (!/^https:\/\/[^/\s]+$/.test(configured) && production) process.env.VITE_SITE_URL = `https://${production}`;
}

// `npm run preview` serves the production build with the same security headers
// (CSP and friends) that Vercel sends, so a CSP problem shows up locally first.
const vercel: { headers: { source: string; headers: { key: string; value: string }[] }[] } = vercelConfig;
const siteHeaders = Object.fromEntries(
  (vercel.headers.find((h) => h.source === '/(.*)')?.headers ?? [])
    .filter((h) => h.key !== 'Strict-Transport-Security')
    .map((h) => [h.key, h.key === 'Content-Security-Policy' ? h.value.replace('; upgrade-insecure-requests', '') : h.value]),
);

/**
 * Writes the category search titles to dist/seo-categories.json for the link
 * preview middleware. The middleware must not import app code: on Vercel it is
 * loaded on its own, and an import it cannot resolve takes down every product
 * and category page (MIDDLEWARE_INVOCATION_FAILED).
 */
function seoCategoriesFile(): Plugin {
  return {
    name: 'seo-categories-file',
    apply: 'build',
    generateBundle() {
      const data = Object.fromEntries(Object.entries(CATEGORY_KEYWORDS).map(([slug, k]) => [slug, { title: k.title, lead: k.lead }]));
      this.emitFile({ type: 'asset', fileName: 'seo-categories.json', source: JSON.stringify(data) });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), seoCategoriesFile()],
  server: { port: 5173 },
  preview: { port: 4173, headers: siteHeaders },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router'],
          motion: ['framer-motion'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
