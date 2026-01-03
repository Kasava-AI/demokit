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
 */

// Add to your .env file:
// DEMOKIT_API_URL=https://demokit-cloud.kasava.dev/api
// DEMOKIT_API_KEY=dk_live_xxxx

import { createRemoteSource } from "@demokit-ai/remix";

// Note: In Remix, access server-side env vars through process.env
// and pass them to the client via loader data if needed
export const demokitSource = createRemoteSource({
  apiUrl: process.env.DEMOKIT_API_URL!,
  apiKey: process.env.DEMOKIT_API_KEY!,
});
