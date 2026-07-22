# Go Crepes — Norwich Market

Marketing site for **Go Crepes**, a Greek street-food stall on Norwich Market
(crepes, souvlaki, Greek bakes, milkshakes, and a browse-and-order flow).

The site is a self-contained static page driven by a small client-side runtime.
There is **no build step** — deploy the repository as static files.

## Structure

```
index.html          The page (markup, styles, and the app component inline)
favicon.svg         Brand mark
assets/             Fonts (woff2), photos (jpg), and the app runtime (js)
assets/vendor/      React, ReactDOM, @babel/standalone (self-hosted, see below)
styles/mobile.css   Mobile UX layer, linked from index.html
scripts/            One-off recovery tooling (not needed at runtime)
vercel.json         Static hosting config (clean URLs + long asset caching)
```

## Local development

Any static file server works, as long as `/assets/...` resolves from the repo root:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Edit `index.html` and `styles/mobile.css` directly — they are the source of truth.

## How this repo was created

The live site was originally published straight to Vercel as a single bundled
HTML document (assets packed inline as base64) and was never committed to git.
`scripts/extract-bundle.mjs` recovers editable source from that bundle: it
unpacks every embedded asset into `assets/` and rewrites the page's references
to point at them.

```bash
node scripts/extract-bundle.mjs <bundle.html> [outDir]
```

The bundle's runtime loaded React, ReactDOM and `@babel/standalone` from unpkg
at page load. Those exact versions are now self-hosted in `assets/vendor/`
(installed from the npm registry: `react@18.3.1`, `react-dom@18.3.1`,
`@babel/standalone@7.29.0`) so the site has no third-party CDN dependency and
loads faster on mobile. The extractor rewrites the CDN URLs to the local copies
automatically.

## Deployment

Connected to Vercel via GitHub — pushing to the default branch deploys to
production. Framework preset: **Other** (static); no build command; output
directory is the repo root.
