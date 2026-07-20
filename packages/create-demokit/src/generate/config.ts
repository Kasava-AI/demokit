/**
 * Generate DemoKit Cloud configuration file.
 */
export function generateCloudConfig(): string {
  return `import { createRemoteSource } from '@demokit-ai/core'

/**
 * DemoKit Cloud configuration.
 * Set your API URL and key in .env.local
 */
export const demokitSource = createRemoteSource({
  apiUrl: import.meta.env.VITE_DEMOKIT_API_URL!,
  apiKey: import.meta.env.VITE_DEMOKIT_API_KEY!,
})
`
}

/**
 * Generate .env.local entries for DemoKit Cloud.
 */
export function generateEnvEntries(): string {
  return `
# DemoKit Cloud
VITE_DEMOKIT_API_URL=https://api.demokit.dev
VITE_DEMOKIT_API_KEY=your-api-key-here
`
}
