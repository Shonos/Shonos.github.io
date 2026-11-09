# 03 — Clean section URLs and original scrolling behavior

Status: captured; not planned. Live-site behavior has not been researched for this brief.

## Owner feedback

> I do not like the #ai, /#work links. are they even SEO compatible? anyway look at the original https://shaunalonzo.com how it handles auto scrolling when clicking a link to e.g. /services, /skills, etc.

## Requested outcome

- Replace fragment-based section navigation with clean paths in the style of `/services` and `/skills`.
- Inspect the original site at **https://shaunalonzo.com** before deciding how to reproduce its click-to-scroll behavior.
- Address SEO implications rather than assuming clean-looking URLs are sufficient.

## Questions to settle during planning

- Observe click navigation, direct entry, refresh, browser Back/Forward, and manual scrolling on the original site. Do not assume how it updates the URL.
- Decide the new paths for current sections such as AI and selected work; the examples are not a complete route map.
- Decide how paths for disabled or combined sections behave.
- Determine canonical and indexing behavior for section routes versus real case-study/profile documents.

## SEO context to verify

Fragment links are valid navigation, but fragments do not create independently indexable page documents. Clean paths alone do not guarantee SEO improvements. Evaluate crawlable links, initial HTML content, canonical URLs, metadata, and GitHub Pages fallback/status behavior together.

## Completion criteria for the eventual change

- Section clicks use the agreed clean paths and scroll to the intended content with header clearance.
- Direct links, reloads, history, existing legacy paths, and old shared fragment links have deliberate behavior.
- Reduced-motion and keyboard users retain usable navigation; without JavaScript, readable content and useful links remain available.
- GitHub Pages behavior and SEO tradeoffs are tested and documented.

Related: [section configuration](02-modular-configurable-sections.md), [opening content](01-about-at-the-start.md).
