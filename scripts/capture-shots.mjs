#!/usr/bin/env node
// Captures still images of the showcase statement for the Intro page (public/shots/*.webp).
// Dev-time tool: `node scripts/capture-shots.mjs` (needs Playwright's Chromium; run
// `npm run prepare:statement` first). Shots are taken at their final pixel size and
// encoded to WebP in the browser, so no image tooling is needed.
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const body = await readFile(join(root, path.endsWith('/') ? path + 'index.html' : path));
    res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const base = `http://localhost:${server.address().port}/statement/index.html`;

const browser = await chromium.launch();
async function shot(name, { width, height, scale, route, before }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale, isMobile: width < 500, hasTouch: width < 500 });
  await page.route(/accessibilityserver\.org|userway/, (r) => r.abort());
  await page.goto(`${base}#${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  if (before) await before(page);
  const png = await page.screenshot();
  await writeFile(join(root, 'shots', `${name}.webp`), await toWebp(png));
  await page.close();
}
async function toWebp(png, quality = 0.82) {
  const page = await browser.newPage();
  const dataUrl = await page.evaluate(
    async ({ b64, quality }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      return canvas.toDataURL('image/webp', quality);
    },
    { b64: png.toString('base64'), quality },
  );
  await page.close();
  return Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
}
await shot('statement-desktop', { width: 1280, height: 800, scale: 1.25, route: '/overview' });
await shot('statement-mobile', { width: 390, height: 844, scale: 2, route: '/overview' });
await browser.close();
server.close();
console.log('captured → public/shots');
