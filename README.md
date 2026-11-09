# shaunalonzo.com

Static personal site built with Vite and deployed to GitHub Pages.

## Development

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. To access the development server from another device on the LAN, run `npm run dev -- --host 0.0.0.0` and open the host machine's LAN address. Edit `content/site.json` for site content. Pages are rendered from JSON at build time; the development server reloads content and shared-template changes. Rebuild after changing content for the production preview.

## Project structure

```text
index.html                 Vite HTML template
templates/                 Shared page, navigation, contact, and case-study partials
work/*/index.html          Static case-study entries (content comes from JSON)
profile/index.html         Printable engineering profile
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
dist-review/               Generated local-review output; do not commit
.github/workflows/         Validation and GitHub Pages deployment
```

Content belongs in `content/site.json`; generated HTML and bundled files in `dist/` should not be edited manually.

## Production preview

```sh
npm run prod
```

This builds the minified artifact in `dist/` and serves it locally. To test GitHub Pages-style deep-link fallback, use `npm run preview:pages` after `npm run build`.

For a LAN-accessible production preview on an unused port:

```sh
npm run build
npm run preview:pages -- --host 0.0.0.0 --port 5187
```

Open `http://<your-LAN-IP>:5187` on a device on the same network. This serves only `dist/`, does not deploy anything, and does not enable production analytics. New case studies and the profile are actual static pages; old section routes still use the Pages fallback. Homepage scrolling no longer rewrites URLs.

The variable Manrope Latin font is self-hosted in `public/assets/fonts/`, with its OFL license. No third-party font or icon stylesheet is requested by the browser.

Official Domain, carsales, and .NET SVG marks are stored locally in `public/assets/brands/`; `SOURCES.md` there records provenance, modifications, guidance, and permission limitations. AWS, MONEYME, and Nowcom remain text references. Optional `brands` entries in `content/site.json` select images; removing an entry keeps its readable name as a text fallback. No browser requests to logo providers are required.

## Visual review and media

```sh
npm run review
```

This builds **`dist-review/`** and serves it at `http://<your-LAN-IP>:5187`. It is local only: no commit, push, or deployment. Stop any earlier server on that port first. Rebuild with `npm run build:review` after edits; a running preview reads the updated artifact.

Six media spaces support supplied images, galleries, video, or honest illustrations. Redbook screenshots fill the hero and Redbook case; its homepage work entry omits the duplicate gallery. Cards Guide PH screenshots fill the personal-project space. The requested orchestration illustration clears the recording request. Two media decisions remain: modernization and integrations. Ordinary `npm run build` output has no review labels. Both builds preserve the static case-study and hiring paths.

The review-only banner links to **Your update checklist**. Every pending media space says **Your input needed** and explicitly identifies itself as a note for Shaun, not visitor copy. The checklist separates optional media decisions from career-date, inquiry/availability, and case-disclosure confirmations; the relevant profile/work/hiring sections carry matching notes. These instructions are excluded from all normal-built pages and from print. Once a decision is agreed, set a media record's optional `reviewed: true`, or a `review` confirmation's `resolved: true`, in `content/site.json`. Counts and flags update on rebuild. Resolving a note does not publish an asset, change career facts, approve deployment, or hide public files.

See **[content/MEDIA.md](content/MEDIA.md)** for the slot map, file guidance, publication controls, and caption/transcript requirements. Media configuration belongs in `content/site.json`; `templates/media.html` renders the shared frames. No demonstration backend or simulated live agent activity is included.

Diagram boxes remain fixed and upright, with no hover or entrance movement. The migration frames now illustrate **build → check → shared traffic → retirement** using HTML and SVG connections. `src/migration-state.js` defines the deterministic routing contract; `src/migration.js` plays a finite 14.4-second sequence once when visible, with Pause/Play/Replay and keyboard-selectable stages. Only one migration runs at a time. Offscreen/background playback pauses without automatic resumption. Reduced motion uses static selectable stages; without JavaScript the complete written sequence remains visible. Labels explicitly identify this as illustrative, not live traffic or measured rollout percentages.

`src/agent-workflow-state.js` and `src/agent-workflow.js` drive the separate orchestration illustration: developer → orchestrator (Sonnet) → planner (Claude Opus), then build/test or conditional research through the orchestrator and back to planning. Both finite routes end at developer approval. Controls, static stage selection, reduced motion, and complete no-JavaScript summaries are included; this is not live execution. Native video never autoplays or loops; it pauses when offscreen or the document is hidden, and is not automatically resumed.

Supplied screenshot originals remain untouched in `my-inputs/`. Public delivery copies retain their pixels/compression and carry sourced-image provenance; see `public/assets/work/SOURCES.md`. Galleries use descriptive alternatives and full-size local links. Screenshot capture/work-period dates were not supplied, and the three career/availability/disclosure confirmations remain open.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run build:review
npm run test:e2e
```

Or run `npm run check` for the complete sequence. Browser tests require both artifacts and start production, review, and development servers on ports 4174, 4175, and 5174 respectively. Coverage includes responsive layout, light/dark preferences, native navigation/history, no-JavaScript content, keyboard interactions, reduced/expressive motion, media errors, and review/production separation. Migration tests check all four rendered states, valid traffic destinations, gradual handover, finite playback, exact pause/resume, replay, visibility pausing, and reduced-motion changes—not just whether boxes fit. Node tests also check the pure migration model and video range transport in the Pages-like preview.

## Deployment

Push to `main` to run validation and deploy `dist/` through GitHub Pages Actions. In repository settings, set Pages **Source** to **GitHub Actions**. Keep the existing custom domain and HTTPS settings; `CNAME` is copied into every production artifact.
