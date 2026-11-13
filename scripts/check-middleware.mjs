// Fails the build if middleware.ts imports anything.
//
// Vercel loads middleware.ts on its own. In November 2026 an import of
// ./src/lib/seoKeywords could not be resolved there, and every product,
// category and project page returned MIDDLEWARE_INVOCATION_FAILED (500) for
// visitors and bots alike. Data the middleware needs is published as a static
// file at build time instead (see seoCategoriesFile in vite.config.ts).
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../middleware.ts', import.meta.url), 'utf8');
const imports = src
  .split(/\r?\n/)
  .filter((line) => /^\s*(import|export\s+\*\s+from|export\s+\{[^}]*\}\s+from)\b/.test(line) && !/^\s*import\s+type\b/.test(line));

if (imports.length) {
  console.error('[check-middleware] middleware.ts must not import code (it breaks on Vercel):');
  for (const line of imports) console.error('  ' + line.trim());
  process.exit(1);
}
console.log('[check-middleware] middleware.ts has no imports.');
