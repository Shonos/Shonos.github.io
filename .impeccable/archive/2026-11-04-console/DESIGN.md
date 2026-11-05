---
name: Shaun Alonzo Portfolio
description: A precise technical portfolio for a senior .NET and AWS engineer.
colors:
  midnight-infrastructure: "rgb(3, 7, 18)"
  deep-console: "rgb(10, 15, 30)"
  section-navy: "rgb(7, 12, 25)"
  console-surface: "rgb(15, 20, 35)"
  telemetry-line: "rgb(30, 40, 60)"
  signal-mint: "#64ffda"
  signal-mint-hover: "#4db6ac"
  text-primary-dark: "#f0f0f0"
  text-secondary-dark: "#a0a0a0"
  light-page: "#f5f7fa"
  light-section: "#edf2f7"
  light-surface: "#ffffff"
  light-border: "#cbd5e0"
  light-accent: "#0d9488"
  light-accent-hover: "#0f766e"
typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif"
    fontSize: "4rem"
    fontWeight: 700
    lineHeight: 1.1
  headline:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans, Helvetica Neue, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  pill: "20px"
  round: "50%"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  section: "5rem"
components:
  button-primary:
    backgroundColor: "transparent"
    textColor: "{colors.signal-mint}"
    rounded: "{rounded.xs}"
    padding: "0.75rem 1.5rem"
  button-primary-hover:
    backgroundColor: "rgba(100, 255, 218, 0.1)"
    textColor: "{colors.signal-mint}"
    rounded: "{rounded.xs}"
    padding: "0.75rem 1.5rem"
  card:
    backgroundColor: "{colors.console-surface}"
    textColor: "{colors.text-primary-dark}"
    rounded: "{rounded.sm}"
    padding: "2rem"
  chip:
    backgroundColor: "{colors.console-surface}"
    textColor: "{colors.text-primary-dark}"
    rounded: "{rounded.pill}"
    padding: "0.5rem 1rem"
---

# Design System: Shaun Alonzo Portfolio

## Overview

**Creative North Star: "The Cloud Engineer's Console"**

The visual system reads like a precise operational console for senior engineering judgment: dark, stable, low-noise, and lit by rare mint signal. It should feel technically fluent without slipping into sci-fi decoration. The interface gives evidence room to breathe, using calm structure, bordered surfaces, and measured motion to make Shaun's experience feel trustworthy and current.

The system is restrained by default. Cards, timelines, chips, and contact surfaces sit on tonal navy layers rather than heavy ornament. Signal Mint marks identity, wayfinding, interactive affordance, and proof points; it should feel like live telemetry on an otherwise quiet infrastructure plane.

**Key Characteristics:**
- Dark technical canvas with layered navy surfaces.
- Mint accent used as signal, not decoration.
- Inter/system typography with direct hierarchy and practical rhythm.
- Flat cards, thin borders, rounded corners, and subtle hover lift.
- Professional, outcome-oriented copy presentation with minimal flourish.

## Colors

The palette is a dual-theme technical system: dark mode is the brand default, while light mode preserves the same hierarchy with cooler neutral surfaces and a deeper teal accent.

### Primary
- **Signal Mint**: the core identity and interaction color, used for the logo, hero name, section rules, buttons, icons, timeline dots, active states, and high-value inline emphasis.
- **Signal Mint Hover**: the darker hover companion for the primary accent, used when mint needs a pressed or lower-luminance state.

### Neutral
- **Midnight Infrastructure**: the default dark page background and fixed header surface.
- **Deep Console**: secondary dark background for fields and nested interface areas.
- **Section Navy**: alternating section surface for Services and Contact blocks.
- **Console Surface**: card and chat background, giving content blocks a distinct but quiet plane.
- **Telemetry Line**: thin borders, timeline rails, dividers, and card outlines.
- **Primary Readout Text**: high-contrast foreground text for headings and important labels.
- **Secondary Readout Text**: muted body, role, metadata, and descriptive text.
- **Light Page / Light Section / Light Surface / Light Border**: light-theme equivalents that keep the same hierarchy without changing the design language.
- **Light Accent / Light Accent Hover**: teal replacements for Signal Mint in light mode where the mint would be too pale.

### Named Rules

**The Signal Rarity Rule.** Mint is a status signal and wayfinding device; do not flood large backgrounds with it or turn every element into an accent block.

**The Navy Layer Rule.** Depth comes first from adjacent navy surfaces and borders. Use color layers before adding extra shadows or decorative panels.

## Typography

**Display Font:** Inter with system sans-serif fallbacks.  
**Body Font:** Inter with system sans-serif fallbacks.  
**Label/Mono Font:** No separate mono face is established; use the same system sans stack.

**Character:** The typography is clean, practical, and engineering-forward. Weight and scale carry authority; the system avoids novelty faces, excessive tracking, and ornamental display treatment.

### Hierarchy
- **Display** (700, 4rem desktop / 2.5rem mobile, 1.1 line-height): hero name and primary first-viewport identity.
- **Headline** (700, 2rem, approximately 1.2 line-height): section titles with a short mint underline.
- **Title** (600, 1.2rem–1.25rem): service cards, project titles, company names, chat header, and contact heading substructure.
- **Body** (400, 0.95rem–1.25rem, 1.6–1.7 line-height): descriptions, timeline bullets, service copy, project summaries, and contact text.
- **Label** (500–600, 0.8rem–1rem): dates, chips, nav links, subtitles, buttons, and compact metadata.

### Named Rules

**The Practical Hierarchy Rule.** Do not introduce decorative typography to create drama; increase clarity through scale, weight, spacing, and accent placement.

## Layout

The layout is a single-page routed portfolio with a fixed header and anchored sections. Content sits in a centered container capped at 1200px with 1.5rem side padding, reduced to 1rem on smaller screens. Sections use generous vertical rhythm, typically 5rem top/bottom on desktop and 3rem on mobile.

The hero uses a two-column text-and-portrait composition on desktop, collapsing to a centered column-reverse layout below 992px. Service cards use a two-column grid that becomes one column below 768px. Project cards use an auto-fit grid with 300px minimum card width, collapsing naturally to one column on mobile. Navigation becomes a full-height mobile drawer below 768px.

Spacing should feel comfortable and scannable, not dense. Each section should expose one clear heading, one obvious path forward, and content blocks that can be understood independently.

## Elevation & Depth

The system is flat-by-default with tonal layering, borders, and small hover transforms. Shadows appear sparingly on the portrait, contribution image, mobile nav, and chat widget, where they clarify physical overlay or media presence. Cards rely primarily on Console Surface plus Telemetry Line borders.

### Shadow Vocabulary
- **Portrait Shadow** (`0 10px 30px rgba(0, 0, 0, 0.3)`): grounded depth for Shaun's circular profile image.
- **Portrait Signal Hover** (`0 15px 35px rgba(100, 255, 218, 0.2)`): subtle mint glow when the portrait lifts on hover.
- **Media Shadow** (`0 5px 15px rgba(0, 0, 0, 0.2)`): modest elevation for image-like assets.
- **Chat Overlay Shadow** (`0 5px 25px rgba(0, 0, 0, 0.2)`): overlay separation for the chat container.
- **Mobile Nav Shadow** (`0 10px 27px rgba(0, 0, 0, 0.05)`): soft separation for the mobile menu.

### Named Rules

**The Flat-at-Rest Rule.** Static cards and sections should not gain heavy shadows. Reserve shadows for media, overlays, and purposeful hover states.

## Shapes

The shape language is softly technical: small-radius rectangles, pill chips, and circular avatar/action controls. Buttons use tight 4px corners. Cards and media use 8px corners. Chat surfaces use 12px for a friendlier utility feel. Chips and message bubbles use pill-like curves. The profile image and floating chat button are fully circular.

Borders are thin and structural. They should remain one-pixel lines in Telemetry Line or Signal Mint rather than becoming thick frames.

## Components

### Buttons
- **Shape:** compact rectangular controls with precise corners (4px radius).
- **Primary:** transparent background, Signal Mint text, one-pixel Signal Mint border, and 0.75rem × 1.5rem padding.
- **Hover / Focus:** low-opacity mint wash with a small upward lift; keep transitions around 0.3s ease.
- **Secondary:** transparent surface, primary text color, Signal Mint border, and the same movement language.

### Chips
- **Style:** Console Surface background, Primary Readout Text, one-pixel Telemetry Line border, pill radius, compact horizontal padding.
- **State:** hover may lift slightly and shift the border to Signal Mint. Chips are proof tags, not large CTAs.

### Cards / Containers
- **Corner Style:** softly rounded rectangles (8px radius).
- **Background:** Console Surface on dark theme, Light Surface on light theme.
- **Shadow Strategy:** flat at rest; hover lift is allowed, heavy card shadows are not.
- **Border:** one-pixel Telemetry Line border, optionally shifting toward Signal Mint on interaction.
- **Internal Padding:** 1.5rem for project cards, 2rem for service cards.

### Inputs / Fields
- **Style:** rounded text field with Deep Console background, one-pixel Telemetry Line border, 20px radius, and compact 10px × 15px padding.
- **Focus:** remove default outline and shift border color to Signal Mint.
- **Disabled:** submit buttons fall back to Telemetry Line and use a not-allowed cursor.

### Navigation
- **Style:** fixed top navigation on Midnight Infrastructure with bottom Telemetry Line border. Links are medium-weight, one-rem labels with hover color shifting to Signal Mint and a mint underline growing from zero width.
- **Active / Mobile:** mobile navigation becomes a full-width, full-height drawer under the header, using the same background, border, gap, and centered link treatment.

### Timeline
- **Style:** work history is anchored by Signal Mint dots and a thin Telemetry Line vertical rail. Dates use Signal Mint, while descriptions stay secondary to keep long evidence blocks readable.

### Chat Assistant
- **Style:** hidden by default behind `.dev-feature`, but when enabled it uses a circular mint launcher, a Console Surface overlay, mint header, pill message bubbles, and compact input controls. It should feel like a utility panel, not a second brand system.

## Do's and Don'ts

### Do:
- **Do** treat Signal Mint as a rare operational signal for identity, navigation, action, and proof.
- **Do** preserve the dark navy layered hierarchy when adding sections or components.
- **Do** use thin borders, small radii, and subtle hover lift for interactive confidence.
- **Do** keep long technical evidence scannable with cards, timelines, chips, and clear section headings.
- **Do** verify dark and light themes together when changing colors or component states.

### Don't:
- **Don't** introduce unrelated bright accent hues unless a redesign explicitly replaces the visual world.
- **Don't** add heavy shadows, glassmorphism, neon glows, or decorative gradients to ordinary cards.
- **Don't** swap in playful, serif, handwritten, or novelty typography for the core interface.
- **Don't** dilute the portfolio with generic SaaS landing-page decoration; the system should feel like a senior engineer's console.
- **Don't** change factual claims, role history, metrics, contact details, or structured data as a visual-system side effect.
