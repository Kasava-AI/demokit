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
// VITE_DEMOKIT_API_URL=https://demokit-cloud.kasava.dev/api
// VITE_DEMOKIT_API_KEY=dk_live_xxxx

import { createRemoteSource } from "@demokit-ai/react-router";

export const demokitSource = createRemoteSource({
  apiUrl: import.meta.env.VITE_DEMOKIT_API_URL,
  apiKey: import.meta.env.VITE_DEMOKIT_API_KEY,
});
