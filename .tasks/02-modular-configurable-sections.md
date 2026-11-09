# 02 — Separate sections and configure visibility

Status: captured; not planned.

## Owner feedback

> let use separate each section in its own file. in fact we should be able to enable/disable sections via config. as right now I feel some sections are not needed

## Requested outcome

- Give each homepage section its own file rather than keeping every section in `index.html`.
- Allow sections to be enabled or disabled through configuration without editing their markup.
- Keep editable content in the existing JSON-driven content system.
- Allow individual sections to be maintained without changing unrelated sections.

## Open decisions

- Which sections should initially be disabled? No list has been chosen yet. (shaun here - keep it all for now)
- Which opening/contact elements, if any, must always remain enabled? (shaun here - keep it all for now)
- Does configuration also need ordering, or only visibility? Ordering was not explicitly requested. (for now no ordering)

## Completion criteria for the eventual change

- Each section has a clear, separate source file and an explicit configuration entry.
- Disabled sections are omitted from rendered output, not merely visually hidden.
- Navigation, internal links, initialization, owner-review counts, and accessibility references do not point to absent content.
- Enabling a section restores its content and behavior without manual markup changes.
- Normal and review builds, case studies, and the profile continue to work.

Related: [opening content](01-about-at-the-start.md), [navigation](03-clean-section-navigation.md). These are coordination points, not an implementation sequence.
