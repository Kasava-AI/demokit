---
'@demokit-ai/core': patch
---

Fix the Next.js schema parser to actually convert bracket dynamic segments (`[id]`, `[...slug]`, `[[...slug]]`) into the `{param}` brace template form it already claimed to emit, so `detectShapeDrift` can match observed request paths against Next.js-sourced dynamic routes instead of reporting every one of them as `unknown_endpoint`.
