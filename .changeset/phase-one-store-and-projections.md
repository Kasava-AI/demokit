---
'@demokit-ai/core': minor
'@demokit-ai/react': minor
'@demokit-ai/db': minor
---

Canonical dataset runtime (Phase 1): `DemoStore` with FK-validated mutations and
op-log persistence (localStorage, version-scoped, tab sync, overflow snapshot);
projection layer serving collection/single/create/update/delete/aggregate
endpoints from one dataset; named transform registry (`transforms` prop) as the
only post-install code seam — cloud mappings reference transforms by name and
nothing ever evals cloud-shipped strings. Cloud payloads may now ship pruned
`models` + `relationships` to activate the store; legacy payloads keep the
existing fixture-map behavior. `transformCode` is retired from all API surfaces.
