# 05 — Preserve approved animations

Status: accepted behavior / guardrail; **not a request for a new animation or polish pass**.

## Owner feedback

> the animation for the migration and agent orchestration are great.

## What to preserve

- The existing migration and agent-orchestration animations are positively approved.
- Preserve their visual language and behavior while changing the opening, section files, configuration, navigation, or media presentation.
- Use them as the incumbent reference for the new shared-library animation, not as permission to redesign them.

## Regression criteria for related tasks

- Diagram boxes remain fixed and upright; motion explains traffic or handoffs rather than moving panels.
- Finite playback, Pause/Play/Replay, stage selection, and conditional research/re-planning remain intact.
- Keyboard access, readable descriptions, reduced-motion alternatives, and no-JavaScript explanations remain intact.
- Hidden/disabled sections do not keep running animations or cause startup errors.
- Light/dark themes and phone layouts continue to work.
- Illustrations remain explicitly non-live; no invented test results or production activity.

Relevant existing sources: `src/migration-state.js`, `src/migration.js`, `templates/migration.html`, `src/agent-workflow-state.js`, `src/agent-workflow.js`, `templates/agentWorkflow.html`, and `assets/agent-workflow.css`.
