# AGENTS.md

## Overview

`shaunalonzo.com` is a hand-maintained static personal website showcasing Shaun Alonzo as a Software Engineer. It is hosted on GitHub Pages.

## Repository Layout

- `index.html`: Vite HTML template rendered from JSON at build time.
- `404.html`: GitHub Pages fallback used by the client-side section router.
- `content/site.json`: Editable site content, metadata, UI labels, and chat responses.
- `content/site.schema.json`: Content validation schema.
- `src/`: Browser modules for navigation, routing, theme, contact, analytics, chat, and startup.
- `assets/styles.css`: Site styles, themes, responsive layout, and animations.
- `assets/`: Source stylesheet and legacy source assets.
- `public/`: Static assets copied directly into production output, including images, favicon, and CNAME.
- `scripts/`: Vite content plugin, validation, build verification, and Pages-like preview server.
- `tests/`: Node unit tests, routing tests, and Playwright browser tests.
- `vite.config.js`: Development and production build configuration.
- `package.json`: Development, build, preview, lint, typecheck, and test commands.
- `dist/`: Generated production artifact; do not commit it.
- `CNAME`: Custom domain configuration. Do not remove or change casually.
- `.github/workflows/`: GitHub Actions workflows, including Pages deployment.

## Development

- Install dependencies with `npm ci`.
- Run the Vite development server with `npm run dev`.
- Local access is `http://127.0.0.1:5173`; use `npm run dev -- --host 0.0.0.0` to access it from another device on the LAN.
- Run `npm run prod` for a fresh minified production build and local preview.
- Run `npm run preview:pages` after building to test GitHub Pages-style deep-link fallback.
- Edit `content/site.json` for content; do not manually duplicate content in generated HTML.
- Test navigation, responsive behavior, light/dark mode, external links, and the contact/chat interactions in a browser.
- Keep paths relative/root-aware so the site works from GitHub Pages.

## Content and Style

- Make focused edits and preserve the existing visual language and responsive behavior.
- Keep personal, career, and contact information consistent across HTML metadata, visible content, structured data, and chat responses.
- Update `index.html` for content and behavior; update `assets/styles.css` for presentation.
- Optimize new images for the web and use descriptive `alt` text.

## Deployment

- Deployment occurs through the repository's GitHub Pages configuration after changes are pushed.
- Before pushing, inspect the diff and verify the site locally. Do not commit secrets or generated files.
