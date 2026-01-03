import type { RemoteConfig } from '@demokit-ai/core'

/**
 * Create a remote source configuration for fetching fixtures from DemoKit Cloud
 *
 * @example
 * ```tsx
 * import { createRemoteSource } from '@demokit-ai/react'
 *
 * const source = createRemoteSource({
 *   apiUrl: process.env.NEXT_PUBLIC_DEMOKIT_API_URL!,
 *   apiKey: process.env.NEXT_PUBLIC_DEMOKIT_API_KEY!,
 * })
 *
 * <DemoKitProvider source={source}>
 *   {children}
 * </DemoKitProvider>
 * ```
 */
export function createRemoteSource(config: RemoteConfig): RemoteConfig {
  return {
    timeout: 10000,
    retry: true,
    maxRetries: 3,
    ...config,
  }
}
