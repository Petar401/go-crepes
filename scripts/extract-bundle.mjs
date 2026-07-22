#!/usr/bin/env node
// Decodes the self-contained "bundler" HTML that Vercel serves for this site
// (produced by a v0/Claude design flow) into plain static source files.
//
// The deployed page embeds two inline scripts:
//   <script type="__bundler/manifest"> { uuid: { mime, compressed, data:<base64> } } </script>
//   <script type="__bundler/template"> "<JSON-encoded HTML string>" </script>
// The template references every asset by bare UUID (src="<uuid>", url("<uuid>")).
// This script writes each asset to assets/<uuid>.<ext>, rewrites the
// references to /assets/<uuid>.<ext>, and emits a clean index.html.
//
// Usage: node scripts/extract-bundle.mjs <bundle.html> [outDir]
//   bundle.html — the raw deployed HTML (fetch the live URL and save it)
//   outDir      — repo root to write into (default: cwd)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/gif': 'gif',
  'font/woff2': 'woff2',
  'font/woff': 'woff',
  'text/javascript': 'js',
  'application/javascript': 'js',
  'text/css': 'css',
};

function extractScript(html, type) {
  const open = `<script type="${type}">`;
  const start = html.indexOf(open);
  if (start === -1) throw new Error(`missing <script type="${type}">`);
  const from = start + open.length;
  const end = html.indexOf('</script>', from);
  return html.slice(from, end);
}

function main() {
  const bundlePath = process.argv[2];
  const outDir = process.argv[3] || process.cwd();
  if (!bundlePath) {
    console.error('usage: node scripts/extract-bundle.mjs <bundle.html> [outDir]');
    process.exit(1);
  }

  const html = readFileSync(bundlePath, 'utf8');
  const manifest = JSON.parse(extractScript(html, '__bundler/manifest'));
  let template = JSON.parse(extractScript(html, '__bundler/template'));

  const assetsDir = join(outDir, 'assets');
  mkdirSync(assetsDir, { recursive: true });

  // The framework runtime pulls React, ReactDOM and @babel/standalone from
  // unpkg at load time. We self-host identical versions under assets/vendor/
  // (sourced from npm — see README) so the site has no external runtime
  // dependency and loads faster on mobile. Rewrite the CDN URLs to local ones.
  const VENDOR_URLS = {
    'https://unpkg.com/react@18.3.1/umd/react.production.min.js':
      '/assets/vendor/react.production.min.js',
    'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js':
      '/assets/vendor/react-dom.production.min.js',
    'https://unpkg.com/@babel/standalone@7.29.0/babel.min.js':
      '/assets/vendor/babel.min.js',
  };

  let written = 0;
  for (const [uuid, entry] of Object.entries(manifest)) {
    const ext = MIME_EXT[entry.mime] || 'bin';
    let bytes = Buffer.from(entry.data, 'base64');
    if (entry.compressed) bytes = gunzipSync(bytes);
    if (ext === 'js') {
      let js = bytes.toString('utf8');
      for (const [cdn, local] of Object.entries(VENDOR_URLS)) js = js.split(cdn).join(local);
      bytes = Buffer.from(js, 'utf8');
    }
    writeFileSync(join(assetsDir, `${uuid}.${ext}`), bytes);
    // Rewrite every reference to this uuid (only those actually present).
    const ref = `/assets/${uuid}.${ext}`;
    template = template.split(uuid).join(ref);
    written++;
  }

  writeFileSync(join(outDir, 'index.html'), template, 'utf8');
  console.log(`wrote index.html + ${written} assets to assets/`);
}

main();
