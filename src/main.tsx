import './index.css';

const root = document.getElementById('root') as HTMLElement;

const REQUIRED_ENV = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const;
const missing = REQUIRED_ENV.filter((name) => !import.meta.env[name]);

/** Shown instead of a blank page when the deployment is misconfigured or fails to start. */
function showStartupError(title: string, detail: string) {
  root.innerHTML = `
    <div style="max-width:560px;margin:15vh auto;padding:0 16px;font-family:system-ui,sans-serif;color:#0f1d3a">
      <h1 style="font-size:22px;margin:0 0 12px">${title}</h1>
      <p style="line-height:1.6;margin:0">${detail}</p>
    </div>`;
}

if (missing.length > 0) {
  showStartupError(
    'Site configuration missing',
    `These environment variables are not set: <code>${missing.join('</code>, <code>')}</code>.
     In Vercel open <b>Settings → Environment Variables</b>, add them, then redeploy.
     Locally, copy <code>.env.example</code> to <code>.env.local</code>.`,
  );
} else {
  // Loaded only after the env check, so a missing variable never crashes module evaluation.
  import('./bootstrap')
    .then(({ mount }) => {
      // index.html carries default title/meta for crawlers that skip JavaScript;
      // each page sets its own from here on, so drop them to avoid duplicates.
      document.head.querySelectorAll('[data-default]').forEach((el) => el.remove());
      mount(root);
    })
    .catch((error: unknown) => {
      console.error(error);
      showStartupError('The site failed to start', 'Please refresh the page. If it keeps happening, check the browser console.');
    });
}
