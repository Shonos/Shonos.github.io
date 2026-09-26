# shaunalonzo.com

Static personal site built with Vite and deployed to GitHub Pages.

## Development

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. To access the development server from another device on the LAN, run `npm run dev -- --host 0.0.0.0` and open the host machine's LAN address. Edit `content/site.json` for site content. The page is rendered from JSON at build time; the development server reloads content changes.

## Project structure

```text
index.html                 Vite HTML template
404.html                   GitHub Pages deep-link fallback
content/site.json          Editable site content and UI copy
content/site.schema.json   Content validation schema
src/                       Browser modules and application behavior
assets/styles.css          Source stylesheet
public/                    Static files copied into dist/
scripts/                   Rendering, validation, build checks, and preview server
tests/                     Unit, routing, and Playwright browser tests
vite.config.js             Vite configuration
dist/                      Generated production output; do not commit
.github/workflows/         Validation and GitHub Pages deployment
```

Content belongs in `content/site.json`; generated HTML and bundled files in `dist/` should not be edited manually.

## Production preview

```sh
npm run prod
```

This builds the minified artifact in `dist/` and serves it locally. To test GitHub Pages-style deep-link fallback, use `npm run preview:pages` after `npm run build`.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## Deployment

Push to `main` to run validation and deploy `dist/` through GitHub Pages Actions. In repository settings, set Pages **Source** to **GitHub Actions**. Keep the existing custom domain and HTTPS settings; `CNAME` is copied into every production artifact.
