# 06 — Rebuild the shared-library diagram as an animation

Status: captured; not planned.

## Owner feedback

> One shared foundation. More useful connections -- this diagram is broken. lets redo. make it animation like the other ones. my concept is - form several services, implement library so they are standardized outpbound GRPC/Http calls, OAuth calls, logs and apm, etc

## Requested outcome

- Replace the broken “One shared foundation. More useful connections.” diagram.
- Create an explanatory HTML-based animation in the same visual language as the approved migration and agent-orchestration components.
- Show several services using a shared library that standardizes outbound gRPC/HTTP calls, OAuth handling, logging, and APM/observability.
- Make the value of common outbound behavior understandable without portraying a live backend.

## Open decisions

- Confirm the specific services, external dependencies, and labels that may be shown publicly.
- Decide whether to show a before/after standardization story, an individual outbound-call journey, or another bounded sequence.
- Confirm which capabilities describe the actual professional library and which, if any, are conceptual extensions. The current case copy emphasizes OAuth and HTTP resilience; do not silently expand historical implementation claims.
- Confirm any additional capability intended by “etc.” rather than inventing one.

## Completion criteria for the eventual change

- Multiple services and the shared-library responsibility are clear; gRPC/HTTP, OAuth, logs, and APM are represented coherently.
- Distinguish business calls, authentication, and observability; do not imply every request fetches a fresh token or that logical shared code must be a separate network service.
- Connectors meet their boxes, avoid labels, and remain legible on phones and desktop in both themes.
- Boxes stay fixed; meaningful, finite motion shows the selected workflow, with controls and readable states comparable to the approved animations.
- Keyboard access, reduced motion, no-JavaScript explanations, and offscreen/background pausing are preserved.
- Validate state/connection invariants and visible behavior, not only whether the diagram fits.
- Keep public claims and captions accurate; no fabricated runtime results or performance measurements.

Likely existing context: the `integrations` media slot in `content/site.json`, shared media rendering, and `/work/resilient-integrations/`. This identifies the affected area, not an implementation design.

Related: [approved animation guardrails](05-preserve-approved-animations.md), [section configuration](02-modular-configurable-sections.md).
