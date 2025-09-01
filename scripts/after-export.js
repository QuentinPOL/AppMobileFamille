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

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function fileExists(p) { try { return fs.statSync(p).isFile(); } catch { return false; } }
function readJson(p, fallback = {}) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}
function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}
function upsertIcon(icons, icon) {
  const key = (i) => `${i.src}|${i.purpose || ''}|${i.sizes || ''}|${i.type || ''}`;
  const idx = icons.findIndex(i => key(i) === key(icon));
  if (idx >= 0) icons[idx] = icon; else icons.push(icon);
}

(function main() {
  if (!fs.existsSync(DIST)) {
    console.error('❌ dist/ introuvable. Lance "npm run build" d’abord.');
    process.exit(1);
  }

  // 1) Copier les icônes PWA si présentes
  ensureDir(DIST_PWA);

  // Liste d’assets gérés (ajoute librement d’autres tailles si tu veux)
  const assetList = [
    'icon-192.png',           // any
    'icon-512.png',           // any
    'icon-192-maskable.png',  // maskable
    'icon-512-maskable.png',  // maskable
    'icon-monochrome.png',    // monochrome (fallback)
  ];

  const have = {};
  for (const f of assetList) {
    const src = path.join(ASSETS_PWA, f);
    if (fileExists(src)) {
      fs.copyFileSync(src, path.join(DIST_PWA, f));
      have[f] = true;
    }
  }

  // 2) Créer / Mettre à jour le manifest.json
  //    - conserve ce qui existe (name, couleurs, etc.)
  //    - ajoute id (bust), start_url, display, et les icônes any/maskable/monochrome
  const manifest = readJson(MANIFEST, {});

  // Champs essentiels (sans écraser si déjà définis)
  manifest.id = `/?build=${Date.now()}`;
  manifest.name = manifest.name || 'DuckManageBase';
  manifest.short_name = manifest.short_name || 'DuckManage';
  manifest.start_url = manifest.start_url || '.';
  manifest.scope = manifest.scope || '/';
  manifest.display = manifest.display || 'standalone';
  manifest.background_color = manifest.background_color || '#ffffff';
  manifest.theme_color = manifest.theme_color || '#ffffff';

  manifest.icons = Array.isArray(manifest.icons) ? manifest.icons : [];

  // any
  if (have['icon-192.png']) {
    upsertIcon(manifest.icons, { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' });
  }
  if (have['icon-512.png']) {
    upsertIcon(manifest.icons, { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' });
  }

  // maskable
  if (have['icon-192-maskable.png']) {
    upsertIcon(manifest.icons, { src: '/pwa/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' });
  }
  if (have['icon-512-maskable.png']) {
    upsertIcon(manifest.icons, { src: '/pwa/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' });
  }

  // monochrome (Android 13+ thématisé)
  if (have['icon-monochrome.png']) {
    upsertIcon(manifest.icons, { src: '/pwa/icon-monochrome.png', sizes: '512x512', type: 'image/png', purpose: 'monochrome' });
  }

  writeJson(MANIFEST, manifest);

  // 3) Copier le Service Worker et injecter un timestamp de build (cache-busting)
  if (!fileExists(PUBLIC_SW)) {
    console.error('❌ public/service-worker.js manquant');
    process.exit(1);
  }
  let sw = fs.readFileSync(PUBLIC_SW, 'utf8');
  sw = sw.replace(/__BUILD_TS__/g, String(Date.now()));
  fs.writeFileSync(DIST_SW, sw, 'utf8');

  // 4) Modifier index.html :
  //    - <html lang="fr">
  //    - <link rel="manifest" ...>
  //    - <meta name="theme-color">
  //    - <link rel="apple-touch-icon" ...> si présent
  //    - bloc d’enregistrement SW + auto-update
  if (!fileExists(INDEX)) {
    console.error('❌ dist/index.html introuvable.');
    process.exit(1);
  }

  let html = fs.readFileSync(INDEX, 'utf8');

  // a) Ajout lang="fr" si absent
  html = html.replace(/<html([^>]*)>/i, (m, attrs) => {
    if (/lang=/.test(attrs)) return `<html${attrs}>`;
    return `<html lang="fr"${attrs}>`;
  });

  // b) Injection manifest + meta theme-color (si absents)
  if (!/rel=["']manifest["']/.test(html)) {
    html = html.replace(
      /<head>/i,
      `<head>
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="${manifest.theme_color || '#ffffff'}">`
    );
  }

  // c) Apple touch icon si présent
  if (have['apple-touch-icon.png'] && !/apple-touch-icon/.test(html)) {
    html = html.replace(
      /<head>/i,
      `<head>
  <link rel="apple-touch-icon" href="/pwa/apple-touch-icon.png">`
    );
  }

  // d) Bloc d’enregistrement SW + auto-refresh (ajoute une fois)
  const registerBlock = `
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js');

      // Vérifier les updates régulièrement
      setInterval(() => reg.update(), 5 * 60 * 1000); // toutes les 5 min

      // Forcer "skip waiting" dès qu'un nouveau SW est prêt
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

      // Si une version "waiting" existe déjà
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });

    } catch (e) { /* no-op */ }
  });
}
</script>`.trim();

  if (!/navigator\.serviceWorker\.register/.test(html)) {
    html = html.replace(/<\/body>/i, `${registerBlock}\n</body>`);
  }

  fs.writeFileSync(INDEX, html, 'utf8');

  console.log('✅ PWA: assets copiés, manifest mis à jour, SW et enregistrement injectés');
})();