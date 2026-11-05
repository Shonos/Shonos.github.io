# Brand asset sources

Checked and downloaded on 2026-11-04. These are third-party trademarks, not this site's identity or a claim of sponsorship. Public availability is not a blanket license or legal clearance. Keep use factual, subordinate to Shaun's identity, and limited to the identified employment/technology context. Review permissions before public deployment if broader use is intended.

## Included locally

### Domain

- Official branding page: https://www.nineforbrands.com.au/branding/domain/
- Public logo kit linked by that page: https://www.nineforbrands.com.au/wp-content/uploads/2023/09/Domain-Logo-Kit-2023-2.zip
- `domain.svg`: `Domain Logo Kit 2023/SVG/Domain_Logo_RGB_GREEN.svg`, extracted without modification.
- `domain-white.svg`: `Domain Logo Kit 2023/SVG/Domain_Logo_RGB_WHITE.svg`, extracted without modification. Selected in the site's dark theme; no CSS recoloring or filters.
- Context: the clearly labeled employment-experience list, not a customer testimonial or partner badge. Other Domain case-study disclosures remain unchanged.

### carsales

- Official source page: https://mediahouse.carsales.com.au/
- Asset linked by that page: https://cdn.prod.website-files.com/63194e0fa808af67d338c275/689f610c15543527d83c46da_Carsales.svg
- Official logo guidance: https://torq.carsales.com.au/design/logo
- `carsales.svg`: all nine paths and one rectangle, with their exact source geometry and blue `#1e90ff`, retained. Removed the non-rendering Illustrator payload, generator comment, and unused namespace. Tightened only the empty artboard to `300 90 425 190`, leaving clear space on every side; no artwork is cropped or redrawn.
- Context: the clearly labeled employment-experience list. No carsales Business or Mediahouse sub-brand is substituted for Shaun's employer.
- Limitation: the complete TORQ guide could not be read in this environment (403; protected browser unavailable). The source and artwork were verified against the official public Mediahouse page, but this is not a claim of express portfolio-use permission.

### .NET

- Official brand repository: https://github.com/dotnet/brand
- Source: https://raw.githubusercontent.com/dotnet/brand/main/logo/dotnet-logo.svg
- Style guide: https://github.com/dotnet/brand/blob/main/dotnet-styleGuide-2024.pdf
- `dotnet.svg`: downloaded without modification. The primary purple square, not an invented badge or certification mark.
- The style guide's page 9 sets a 50px minimum for the primary square logo, with clear space equal to the height of its N. Rendered at 56 × 56px with 16px surrounding space in the toolkit heading; never squeezed into tiny tags or body copy. Original purple `#512bd4` and white remain unchanged in both themes.
- The repository README's CC0 statement refers to **illustrations**. It must not be presented as a blanket trademark license for the .NET logo. The repo supplies logo resources and guidelines for representing .NET; this site uses the mark solely to identify the technology.

## Deliberate text fallbacks

- **AWS:** https://aws.amazon.com/trademark-guidelines/ (updated 2026-07-17), section 13, asks third-party fair-use references to be factual **plain text only, no logos**. No separate logo authorization or partner status was supplied. A customer license for the *Powered by AWS* mark would not authorize a generic AWS expertise badge, and this marketing site is hosted on GitHub Pages. Keep AWS text in the stack, diagrams, and case studies; no AWS logo downloaded or shipped.
- **MONEYME:** https://www.moneyme.com.au/terms-of-use restricts website information to personal reference and prohibits other reproduction/distribution. Keep the name in text unless a separately usable asset or permission is supplied. No logo copied from that website.
- **Nowcom:** https://www.nowcom.com/ was blocked by the ordinary reader; the protected-browser tool was unavailable. No verified reusable first-party logo was obtained. Keep the name in text rather than source an unknown aggregator asset.
- Earlier employers mentioned only in the prose are not turned into an additional promotional logo wall.

## Rendering and accessibility

All shipping marks are small, self-contained SVG images without scripts, external references, fonts, or tracking. They are served from this site's own `assets/brands/` directory, not hotlinked. Explicit dimensions reserve layout space. Employer/technology names remain in HTML text or image alternatives, and surrounding role, skill, metadata, and case-study copy stays text. The brand partial falls back to text if a mark is removed from `content/site.json`; it needs no JavaScript. A monochrome print name replaces employer images in print. Logos are not inserted into headings that carry the site's search proposition.
