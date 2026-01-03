/**
 * DemoKit Remote Configuration
 *
 * Configure the API endpoint and key for remote fixture loading.
 * Your fixtures are served from DemoKit Cloud.
 *
 * API Key Types:
 *   - Fixture Key (dk_live_xxxx): Access a single specific fixture
 *   - Project SDK Key (dk_live_proj_xxxx): Access all demos in a project
 *
 * API Endpoints:
 *   The SDK appends `/fixtures` to your apiUrl automatically.
 *
 *   With a Project SDK Key, you can dynamically select demos:
 *   GET /demos                              - List all demos
 *   GET /demos/:slug                        - Load demo (default variant)
 *   GET /demos/:slug/variants/:variantSlug  - Load specific variant
 */

// Add to your .env.local file:
// NEXT_PUBLIC_DEMOKIT_API_URL=https://demokit-cloud.kasava.dev/api
// NEXT_PUBLIC_DEMOKIT_API_KEY=dk_live_xxxx

import { createRemoteSource } from "@demokit-ai/next";

export const demokitSource = createRemoteSource({
  apiUrl: process.env.NEXT_PUBLIC_DEMOKIT_API_URL!,
  apiKey: process.env.NEXT_PUBLIC_DEMOKIT_API_KEY!,
});
