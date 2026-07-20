---
'@demokit-ai/core': minor
'@demokit-ai/ai': minor
'@demokit-ai/db': minor
'@demokit-ai/react': minor
---

Phase 2: publish pipeline + StorySpec.

- `StorySpec` IR (`storySpecSchema`, `parseStorySpec`) and a deterministic executor: `generateFromStorySpec` with anchors (generated first, preferred FK targets), pins (`Model.field`, `sum()`, `avg()`, `count()` — exact aggregate back-solve), and trend-shaped date distributions. New deterministic validators `aggregate_mismatch` and `story_date_out_of_range`.
- `writeStorySpec` (`@demokit-ai/ai`): Haiku spec-writer converting prose to a schema-sanitized StorySpec.
- Publish pipeline schema (`@demokit-ai/db`): `fixtures.activeGenerationId` renamed to `publishedGenerationId`, new `draftGenerationId`, immutable `publishes` audit table, `fixture_generations.unreviewedRows`, `demo_variants.storySpec`. BREAKING for self-hosters: run your app's migration flow (`db:push` regenerates; the column rename must be applied as a rename) and note `updateFixtureSchema` no longer accepts `activeGenerationId` — use `POST .../publish`.
- Preview sessions: `RemoteConfig.previewToken`, `?demo-preview` read from the page URL by the react provider, ephemeral in-memory op-log for previews.
