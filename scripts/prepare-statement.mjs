#!/usr/bin/env node
// Builds the showcase copy of the interactive statement.
//
//   source/statement/index.html  (supplied single-file build, never edited)
//     → public/statement/index.html  (patched: showcase wording + live-data hook)
//     → public/statement/assets/*    (logo, mark, sponsor logo, video poster)
//   source/statement.json          → public/data/statement.json
//   source/Sepire_Statement_v1.1.pdf → public/pdf/Sepire_Statement_v1.1.pdf
//   GraphQL SDL, JSON Schema, OpenAPI and sample payload → public/data/ (scripts/gen-schemas.mjs)
//
// Run automatically by `npm run dev` / `npm run build`.

import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate as generateSchemas } from './gen-schemas.mjs';
import { BUNDLE_PATCHES, DATA_HOOK, HEAD_SCRIPT, HTML_PATCHES, SHOWCASE_CSS } from './statement-patches.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (...p) => join(root, 'source', ...p);
const pub = (...p) => join(root, 'public', ...p);

function countOf(haystack, needle) {
  let n = 0;
  for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + needle.length)) n++;
  return n;
}

function apply(text, patch, where) {
  const expected = patch.count ?? 1;
  const found = countOf(text, patch.find);
  if (found !== expected) {
    throw new Error(`[${where}] expected ${expected} match(es), found ${found}: ${patch.find.slice(0, 120)}`);
  }
  return text.split(patch.find).join(patch.replace);
}

function videoPoster() {
  // 16:9 warm brand poster. Text is rendered by the statement on top of it, so none here.
  const W = 1280, H = 720;
  const dots = [];
  for (let y = 18; y < H * 0.62; y += 22) {
    for (let x = W * 0.45; x < W - 10; x += 22) {
      const d = Math.hypot(W - x, y) / (W * 0.62);
      const r = Math.max(0, 5.2 * (1 - d));
      if (r > 0.6) dots.push(`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(2)}"/>`);
    }
  }
  const pts = [
    [720, 560], [812, 520], [904, 470], [996, 486], [1088, 372], [1180, 318],
  ];
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  const area = `${line} L1180 720 L720 720 Z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFF6EF"/><stop offset=".45" stop-color="#FDECE0"/><stop offset="1" stop-color="#F6C39B"/>
    </linearGradient>
    <radialGradient id="glow" cx="1" cy="1" r=".75">
      <stop offset="0" stop-color="#E5833B" stop-opacity=".95"/><stop offset="1" stop-color="#E5833B" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity=".55"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <g fill="#E5833B" fill-opacity=".42">${dots.join('')}</g>
  <path d="${area}" fill="url(#area)"/>
  <path d="${line}" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  <g fill="#FFFFFF" stroke="#E5833B" stroke-width="4">${pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9"/>`).join('')}</g>
</svg>
`;
}

async function main() {
  const html = await readFile(src('statement', 'index.html'), 'utf8');
  const m = html.match(/<script type="module" crossorigin>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('Could not find the module script in source/statement/index.html');

  let bundle = apply(m[1], DATA_HOOK, 'data-hook');
  for (const p of BUNDLE_PATCHES) bundle = apply(bundle, p, 'bundle');

  let out = html.replace(m[1], () => bundle);
  for (const p of HTML_PATCHES) out = apply(out, p, 'html');
  // Data hook script runs before the bundle; showcase CSS goes last in <head> so it wins.
  out = apply(out, { find: '<script type="module" crossorigin>', replace: `${HEAD_SCRIPT}\n    <script type="module" crossorigin>` }, 'head-script');
  out = apply(out, { find: '</head>', replace: `    ${SHOWCASE_CSS}\n  </head>` }, 'showcase-css');

  await mkdir(pub('statement', 'assets'), { recursive: true });
  await mkdir(pub('data'), { recursive: true });
  await mkdir(pub('pdf'), { recursive: true });
  await writeFile(pub('statement', 'index.html'), out);

  const brand = (f) => pub('brand', f);
  const assets = (f) => pub('statement', 'assets', f);
  await copyFile(brand('sepire-logo.svg'), assets('sepire-logo.svg'));
  await copyFile(brand('sepire-mark.png'), assets('sepire-mark.png'));
  await copyFile(brand('sepire-mark-white.png'), assets('sepire-mark-white.png'));
  await copyFile(src('brand', 'plan-sponsor-logo.svg'), assets('plan-sponsor-logo.svg'));
  await copyFile(src('brand', 'plan-sponsor-logo.svg'), assets('plan-sponsor-logo.es.svg'));
  const poster = videoPoster();
  await writeFile(assets('video-placeholder.svg'), poster);
  await writeFile(assets('video-placeholder.es.svg'), poster);

  await copyFile(src('statement.json'), pub('data', 'statement.json'));
  await copyFile(src('Sepire_Statement_v1.1.pdf'), pub('pdf', 'Sepire_Statement_v1.1.pdf'));

  const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
  console.log(`statement: ${BUNDLE_PATCHES.length + 1} bundle patches applied → public/statement/index.html (${kb(Buffer.byteLength(out))})`);
  const schemas = await generateSchemas();
  console.log(`schemas: ${schemas.sections} sections, ${schemas.types} object types → public/data/`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
