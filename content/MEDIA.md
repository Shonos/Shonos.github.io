# Screenshot and recording handoff

The current diagrams are conceptual explanations, not product screenshots or live agent results. All six slots are pending. The LAN review labels where real media can go; a normal production build removes those review notes.

In the review site, open **Your update checklist** from the top banner. **Your input needed** boxes are working notes for Shaun, not final visitor copy. Media upgrades are optional: supply approved media, confirm keeping an illustration where shown, or omit that space. After agreeing on a decision, a media record can use `reviewed: true` to clear its note/count without changing `kind` or `publish`. Published media also clears its pending note. Separate `review` confirmations track career dates, inquiry options, and public-safe case-study wording. There is no upload form or automatic publishing action.

## What to send

Screenshots of employer work and personal projects can come first. Send the original image or short recording, the slot it belongs in, one sentence about what it shows, and what you personally contributed. One strong asset is enough to start; every slot is optional.

For employer material, confirm publication permission and the relevant work period. Remove customer information, credentials, internal URLs, proprietary source, and private names. Use a sandbox if necessary and label it as such. A screenshot must not imply ownership of work you did not do. Don't manufacture metrics, terminal output, agent results, or a currently running demo.

**Keep unapproved originals outside `public/` and this repository.** Vite copies all files in `public/` into both artifacts, even when they are not rendered. `publish: false` controls display, not access or confidentiality. A LAN preview is not authenticated or private from other devices on that network.

## Slot map

| Key in `media` | Placement | Useful material |
| --- | --- | --- |
| `featured` | Hero | A project overview or concise walkthrough. Its case link currently points to .NET modernization; update that link/context if another project is featured. |
| `modernization` | First work preview and .NET case study | Approved architecture view, sanitized release walkthrough, or relevant product screen. |
| `integrations` | Second preview and integrations case | Approved diagram or sandbox demonstration of authentication and failure handling. |
| `product` | Third preview and Redbook case | Relevant desktop/mobile screenshots, attributed to the actual work period. |
| `agents` | AI section | A real bounded task: context, approved tools, checks, and human review. |
| `personal-project` | AI section after the evidence stories | Card Guide PH or another clearly identified personal project. Hidden from ordinary output while pending. |

The slots are flexible: each supports a single image or native video. A composed desktop/mobile image can use one slot. The work records select their frame by the `media` key. Avoid duplicating a screenshot in JSON or generated HTML.

Pending `migration` layouts share an HTML/SVG rollout illustration: the existing system serves while the replacement is built and checked, both serve during staged handover, then the existing system is turned off. Edit its shared labels and four written stages in `migration` in `content/site.json`; `templates/migration.html` renders it. It plays once with controls, never moves system boxes on hover, and is explicitly not live traffic. Reduced motion keeps selectable static stages; no JavaScript keeps the whole written sequence. Publishing a real image/video replaces this illustration normally; it does not create a running demo backend.

## Files and delivery targets

- Images: WebP, AVIF, PNG, or JPEG; around 1600px wide is usually enough. Prefer a legible product crop to an entire monitor. Aim for 150–400KB where text remains readable; remove unnecessary metadata.
- Video: compressed MP4 (H.264) or WebM, ideally 15–45 seconds and under 8MB. These are delivery targets, not build-enforced limits. Prefer video to animated GIFs.
- Every video needs an image poster, an accessible description (`alt`), a written transcript/description, the matching MIME type, and an explicit `hasAudio` boolean. Speech or meaningful audio also requires an English WebVTT captions file. Keep recordings manually played, with native controls and no loop.
- Put only approved, sanitized delivery files in `public/assets/work/`. JSON paths start at `assets/work/`, without `public/` or a leading slash. Filenames use letters, numbers, hyphens, or underscores.
- Set `width` and `height` to the asset's actual dimensions. Frames contain rather than crop real media, preserving interface text in both themes.
- Record source, permission, capture date/work period, modifications, and personal contribution alongside new assets. Embed sourced-image provenance using the project's Impeccable provenance workflow before handing off a shipping raster. Do not copy private permission records into publicly served files.

## Connect an approved image

Edit the existing record in `content/site.json`; keep its `layout`, `title`, `placeholder`, `brief`, and `nodes` so the conceptual fallback remains available. Add/change:

```json
{
  "kind": "image",
  "publish": true,
  "src": "assets/work/project-overview.webp",
  "alt": "Describe the actual feature or decision visible in this image.",
  "width": 1600,
  "height": 1000,
  "caption": "Project name · your contribution · relevant work period"
}
```

Use the real project details, not the example sentence. Set a factual caption when replacing a conceptual illustration; don't leave “conceptual illustration” on an actual screenshot. Images open the full source in a new tab.

## Connect an approved video

Change the same record, preserving its fallback fields:

```json
{
  "kind": "video",
  "publish": true,
  "src": "assets/work/agent-task.mp4",
  "mime": "video/mp4",
  "poster": "assets/work/agent-task-poster.webp",
  "alt": "Describe the task demonstrated by this recording.",
  "width": 1600,
  "height": 1000,
  "hasAudio": true,
  "captions": "assets/work/agent-task-en.vtt",
  "transcript": "A concise but complete account of the task, actions, checks, and result, including any spoken content.",
  "caption": "Recorded sandbox demonstration · not a live run"
}
```

For silent footage set `hasAudio: false`; the written description is still required. If the recording replaces the agents illustration, its workflow explanation remains readable but illustration selection/replay controls are not created. Update the AI story text if a different task requires a different explanation.

## Review before publication

1. Confirm permission, sanitize, optimize, and record provenance before copying approved files into `public/`.
2. Update the slot and any linked project context; `kind: "pending"` must keep `publish: false`. Returning to pending restores the conceptual fallback, but remove any no-longer-approved public files separately.
3. Run `npm run check`. Validation checks local paths and files, image/video formats, video MIME matching, transcripts, and required captions.
4. Inspect `npm run review` on desktop and phone, both themes and reduced motion. Check image legibility, video playback/seeking, captions, and actual download size on a phone. Failure feedback leaves the written explanation and case links available.
5. Inspect the ordinary `dist/` artifact too: review labels must be absent. New media still needs real-device playback verification; current transport/rendering tests use controlled fixtures, not proof that an eventual recording is compatible.

Nothing in this workflow commits, pushes, or deploys the site automatically.
