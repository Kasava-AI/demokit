---
'@demokit-ai/core': minor
'@demokit-ai/react': minor
'create-demokit': major
---

Demo mode now blocks unmatched non-GET requests by default (returns a mock 409
and fires `onMutationBlocked`; the React provider shows a dismissible toast).
Restore the old behavior with `unmatchedMutations: 'passthrough'`.

Removed: the query-key matcher exports from core (`QueryKey`,
`QueryKeyElement`, `QueryKeyMatchResult`) — network-layer interception covers
TanStack Query and SWR without adapters. create-demokit now scaffolds React
SPAs only.
