// scripts/after-export.js
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const ASSETS_PWA = path.join(ROOT, 'assets', 'pwa');
const PUBLIC_SW = path.join(ROOT, 'public', 'service-worker.js');
const DIST_PWA = path.join(DIST, 'pwa');
const INDEX = path.join(DIST, 'index.html');
const DIST_SW = path.join(DIST, 'service-worker.js');
const MANIFEST = path.join(DIST, 'manifest.json');

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }
function fileExists(p){ try { return fs.statSync(p).isFile(); } catch { return false; } }

(function main() {
  if (!fs.existsSync(DIST)) {
    console.error('❌ dist/ introuvable. Lance "npm run build" d’abord.');
    process.exit(1);
  }

  // 1) Icônes -> dist/pwa (si présentes)
  ensureDir(DIST_PWA);
  const icon192 = path.join(ASSETS_PWA, 'icon-192.png');
  const icon512 = path.join(ASSETS_PWA, 'icon-512.png');
  const have192 = fileExists(icon192);
  const have512 = fileExists(icon512);
  if (have192) fs.copyFileSync(icon192, path.join(DIST_PWA, 'icon-192.png'));
  if (have512) fs.copyFileSync(icon512, path.join(DIST_PWA, 'icon-512.png'));

  // 2) Manifest à la racine (si tu en as déjà un généré, on le garde)
  if (!fileExists(MANIFEST)) {
    const manifest = {
      name: "DuckManageBase",
      short_name: "DuckManage",
      start_url: ".",
      scope: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#ffffff",
      icons: []
    };
    if (have192) manifest.icons.push({ src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" });
    if (have512) manifest.icons.push({ src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" });
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');
  }

  // 3) Copie du SW dans dist + remplacement du timestamp
  if (!fileExists(PUBLIC_SW)) {
    console.error('❌ public/service-worker.js manquant');
    process.exit(1);
  }
  let sw = fs.readFileSync(PUBLIC_SW, 'utf8');
  sw = sw.replace(/__BUILD_TS__/g, String(Date.now())); // bust cache à chaque build
  fs.writeFileSync(DIST_SW, sw, 'utf8');

  // 4) Injection <link rel="manifest"> + enregistrement SW + auto-update
  let html = fs.readFileSync(INDEX, 'utf8');

  if (!/rel=["']manifest["']/.test(html)) {
    html = html.replace(
      /<head>/i,
      `<head>
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#ffffff">`
    );
  }

  // bloc d’enregistrement SW + auto-refresh
  const registerBlock = `
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js');

      // Check updates régulièrement
      setInterval(() => reg.update(), 60 * 1000); // toutes les 60s; mets 5 * 60 * 1000 si tu préfères

      // Skip waiting dès qu'un nouveau SW est prêt
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw && nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            nw.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      // Reload 1x quand le nouveau SW prend le contrôle
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      });

      // Si une version "waiting" existe déjà (site resté ouvert), on force aussi
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });

    } catch(e) { /* no-op */ }
  });
}
</script>`;

  if (!/navigator\.serviceWorker\.register/.test(html)) {
    html = html.replace(/<\/body>/i, registerBlock + "\n</body>");
  }

  fs.writeFileSync(INDEX, html, 'utf8');
  console.log('✅ PWA: manifest, SW, auto-update injectés');
})();