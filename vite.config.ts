import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import vercelConfig from './vercel.json';
import { CATEGORY_KEYWORDS } from './src/lib/seoKeywords';

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
