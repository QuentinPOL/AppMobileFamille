// scripts/after-export.js
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const ASSETS_PWA = path.join(ROOT, 'assets', 'pwa');         // icônes source
const PUBLIC_SW = path.join(ROOT, 'public', 'service-worker.js');
const DIST_PWA = path.join(DIST, 'pwa');
const DIST_SW = path.join(DIST, 'service-worker.js');
const INDEX = path.join(DIST, 'index.html');
const MANIFEST_DIST = path.join(DIST, 'manifest.json');

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function fileExists(p) { try { return fs.statSync(p).isFile(); } catch { return false; } }

(function main() {
  if (!fs.existsSync(DIST)) {
    console.error('❌ dist/ introuvable. Lance d’abord "npm run build".');
    process.exit(1);
  }

  // 1) Copier icônes vers dist/pwa
  ensureDir(DIST_PWA);
  const icon192 = path.join(ASSETS_PWA, 'icon-192.png');
  const icon512 = path.join(ASSETS_PWA, 'icon-512.png');
  const have192 = fileExists(icon192);
  const have512 = fileExists(icon512);
  if (have192) fs.copyFileSync(icon192, path.join(DIST_PWA, 'icon-192.png'));
  if (have512) fs.copyFileSync(icon512, path.join(DIST_PWA, 'icon-512.png'));
  console.log('✅ Icônes copiées (si présentes)');

  // 2) Générer manifest.json à la racine de dist
  const manifest = {
    name: "AppMobileBase",
    short_name: "AppMobile",
    start_url: ".",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: []
  };
  if (have192) manifest.icons.push({ src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" });
  if (have512) manifest.icons.push({ src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" });
  fs.writeFileSync(MANIFEST_DIST, JSON.stringify(manifest, null, 2), 'utf8');
  console.log('✅ Manifest généré -> dist/manifest.json');

  // 3) Copier le Service Worker dans dist/
  if (!fileExists(PUBLIC_SW)) {
    console.error('❌ public/service-worker.js introuvable');
    process.exit(1);
  }
  fs.copyFileSync(PUBLIC_SW, DIST_SW);
  console.log('✅ Service worker copié -> dist/service-worker.js');

  // 4) Injecter <link rel="manifest"> et l’enregistrement du SW dans index.html
  let html = fs.readFileSync(INDEX, 'utf8');

  if (!/rel=["']manifest["']/.test(html)) {
    html = html.replace(
      /<head>/i,
      `<head>\n  <link rel="manifest" href="/manifest.json">\n  <meta name="theme-color" content="#ffffff">`
    );
  }
  if (!/navigator\.serviceWorker\.register\(/.test(html)) {
    html = html.replace(
      /<\/body>/i,
      `<script>
        if ('serviceWorker' in navigator) {
          window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
              .then(() => console.log('SW registered'))
              .catch(err => console.warn('SW failed', err));
          });
        }
      </script></body>`
    );
  }
  fs.writeFileSync(INDEX, html, 'utf8');
  console.log('✅ index.html patché (manifest + register SW)');

  console.log('🎉 PWA prête: manifest + SW actifs dans dist/');
})();