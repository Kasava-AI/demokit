---
'@demokit-ai/core': minor
'@demokit-ai/ai': minor
'@demokit-ai/db': minor
'@demokit-ai/react': minor
---

Phase 3: dashboard v1, narrative linter, coverage health.

- Coverage health (spec §8): `createCoverageReporter` batches demo-mode misses (paths and methods only — never values) to the cloud; new interceptor callbacks `onUnmatchedRequest`/`onProjectionError`; `buildProjectionMap` reports unserved mappings; react provider reports by default (`reportCoverage={false}` to opt out; preview sessions never report). `api_call_logs` gains event types.
- Narrative linter (`@demokit-ai/ai`): `buildNarrativeSample` (deterministic — anchors, precomputed aggregates, date/numeric ranges) + `runNarrativeLinter` (advisory Haiku review; findings stored on generations, shown at publish, never blocks).
- Back-solve fix: integer-typed pinned columns scale in whole units; `avg()` pins target rows that have the field.
- Dashboard v1: publish/rollback UI with audit history and confirm-step warnings, draft preview sessions (customer app URL at `projects.settings.previewUrl`), entity-row editing to draft generations with auto-pinned anchor edits (spec Decision 4), the story prompt box (prose → StorySpec → deterministic regeneration), and a per-fixture Coverage tab.
- Publishing now clears `unreviewedRows` (publish = deliberate review) and returns `linterFindings`.
