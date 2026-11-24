// After `expo export -p web`: makes the web app installable on a phone's home
// screen ("Add to Home Screen" on iPhone), lets links inside it open directly,
// and keeps old addresses working.
//
//   node scripts/web-pwa.mjs <site folder>
//
// The site is served at https://app.btgministry.org:
//   /          the members' web app (this export)
//   /admin/    the staff dashboard
// It adds the home-screen icon, app name and colours to index.html, writes a web
// manifest, and writes 404.html: GitHub Pages serves that for any address it
// doesn't have (e.g. /events/123), and the app then shows that page.
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [site] = process.argv.slice(2);
if (!site) throw new Error('usage: web-pwa.mjs <site folder>');

const INK = '#17120E';
copyFileSync('assets/images/icon.png', join(site, 'apple-touch-icon.png'));
copyFileSync('assets/images/icon.png', join(site, 'icon-1024.png'));
writeFileSync(
  join(site, 'manifest.webmanifest'),
  JSON.stringify(
    {
      name: 'BTG Ministry',
      short_name: 'BTG',
      start_url: '/home',
      scope: '/',
      display: 'standalone',
      background_color: INK,
      theme_color: INK,
      icons: [{ src: '/icon-1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' }],
    },
    null,
    2,
  ),
);

// Old addresses: the dashboard used to be at the site's root with #/ links, and
// the web app under /app/. GitHub sends lumanya.github.io/btg-ministry-app/... here.
const oldLinks = `<script>(function(){var p=location.pathname,h=location.hash;
if(p.indexOf('/admin')===0){location.replace('/admin/'+h);return}
if(p==='/'&&h.indexOf('#/')===0){location.replace('/admin/'+h);return}
if(p==='/app'||p.indexOf('/app/')===0){location.replace((p.slice(4)||'/')+location.search+h)}})();</script>`;

const head = [
  oldLinks,
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
  '<link rel="manifest" href="/manifest.webmanifest">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="BTG Ministry">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  `<meta name="theme-color" content="${INK}">`,
  // Ink behind the app while it starts, instead of a white flash.
  `<style>html,body{background:${INK}}</style>`,
].join('');

const indexPath = join(site, 'index.html');
let html = readFileSync(indexPath, 'utf8');
// Let the app draw under the iPhone's notch and home bar (it keeps clear of them itself).
html = html.replace(/<meta name="viewport" content="([^"]*)"/, (m, c) => (c.includes('viewport-fit') ? m : `<meta name="viewport" content="${c}, viewport-fit=cover"`));
html = html.replace('<head>', `<head>${head}`);
writeFileSync(indexPath, html);
writeFileSync(join(site, '404.html'), html);
console.log(`web-pwa: ${indexPath} and 404.html ready`);
