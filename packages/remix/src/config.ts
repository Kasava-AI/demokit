import type { RemoteSourceConfig } from './types'

/**
 * Create a remote source configuration for fetching fixtures from DemoKit Cloud
 *
 * The SDK appends `/fixtures` to your apiUrl, so provide the versioned base URL.
 *
 * @example
 * ```typescript
 * // lib/demokit-config.ts
 * import { createRemoteSource } from '@demokit-ai/remix'
 *
 * // .env:
 * // DEMOKIT_API_URL=https://demokit-cloud.kasava.dev/api
 * // DEMOKIT_API_KEY=dk_live_xxxx
 *
 * export const demokitSource = createRemoteSource({
 *   apiUrl: process.env.DEMOKIT_API_URL!,
 *   apiKey: process.env.DEMOKIT_API_KEY!,
 * })
 *
 * // Then in root.tsx:
 * import { demokitSource } from '~/lib/demokit-config'
 *
 * <DemoRemixProvider source={demokitSource}>
 *   <Outlet />
 * </DemoRemixProvider>
 * ```
 */
export function createRemoteSource(config: RemoteSourceConfig): RemoteSourceConfig {
  return {
    timeout: 10000,
    retry: true,
    maxRetries: 3,
    ...config,
  }
}
