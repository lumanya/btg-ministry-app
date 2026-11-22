// After `expo export -p web`: makes the web build installable on a phone's home
// screen ("Add to Home Screen" on iPhone) and lets links inside it open directly.
//
//   node scripts/web-pwa.mjs <dist folder> <base url> <site 404.html path>
//
// It adds the home-screen icon, app name and colours to index.html, writes a web
// manifest, and writes the site's 404.html: GitHub Pages serves that file for any
// address it doesn't have (e.g. /app/events/123), and the app then shows that page.
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [dist, base, notFound] = process.argv.slice(2);
if (!dist || !base || !notFound) throw new Error('usage: web-pwa.mjs <dist> <base> <404.html>');

const INK = '#17120E';
copyFileSync('assets/images/icon.png', join(dist, 'apple-touch-icon.png'));
copyFileSync('assets/images/icon.png', join(dist, 'icon-1024.png'));
writeFileSync(
  join(dist, 'manifest.webmanifest'),
  JSON.stringify(
    {
      name: 'BTG Ministry',
      short_name: 'BTG',
      start_url: `${base}/home`,
      scope: `${base}/`,
      display: 'standalone',
      background_color: INK,
      theme_color: INK,
      icons: [{ src: `${base}/icon-1024.png`, sizes: '1024x1024', type: 'image/png', purpose: 'any' }],
    },
    null,
    2,
  ),
);

const head = [
  `<link rel="apple-touch-icon" href="${base}/apple-touch-icon.png">`,
  `<link rel="manifest" href="${base}/manifest.webmanifest">`,
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="BTG Ministry">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  `<meta name="theme-color" content="${INK}">`,
  // Ink behind the app while it starts, instead of a white flash.
  `<style>html,body{background:${INK}}</style>`,
].join('');

const indexPath = join(dist, 'index.html');
let html = readFileSync(indexPath, 'utf8');
// Let the app draw under the iPhone's notch and home bar (it keeps clear of them itself).
html = html.replace(/<meta name="viewport" content="([^"]*)"/, (m, c) => (c.includes('viewport-fit') ? m : `<meta name="viewport" content="${c}, viewport-fit=cover"`));
html = html.replace('</head>', `${head}</head>`);
writeFileSync(indexPath, html);

// The dashboard uses #/ links, so only app addresses ever reach 404.html; anything
// else goes back to the dashboard.
const guard = `<script>if(!location.pathname.startsWith(${JSON.stringify(base + '/')})&&location.pathname!==${JSON.stringify(base)})location.replace(${JSON.stringify(base.replace(/\/app$/, '/'))});</script>`;
writeFileSync(notFound, html.replace('<head>', `<head>${guard}`));
console.log(`web-pwa: ${indexPath} and ${notFound} ready`);
