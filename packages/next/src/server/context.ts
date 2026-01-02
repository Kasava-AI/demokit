import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * Server-side demo mode context
 */
export interface ServerDemoContext {
  /**
   * Whether demo mode is enabled
   */
  enabled: boolean

  /**
   * The current scenario name
   */
  scenario: string | null
}

/**
 * AsyncLocalStorage for server-side demo mode context
 * This allows Server Components to access demo mode state
 */
export const demoContextStorage = new AsyncLocalStorage<ServerDemoContext>()

/**
 * Get the current server-side demo context
 * Returns null if not in a demo context
 */
export function getServerDemoContext(): ServerDemoContext | null {
  return demoContextStorage.getStore() ?? null
}

/**
 * Check if demo mode is enabled on the server
 */
export function isServerDemoMode(): boolean {
  const context = getServerDemoContext()
  return context?.enabled ?? false
}

/**
 * Get the current scenario on the server
 */
export function getServerScenario(): string | null {
  const context = getServerDemoContext()
  return context?.scenario ?? null
}

/**
 * Run a function within a demo context
 */
export function runWithDemoContext<T>(
  context: ServerDemoContext,
  fn: () => T
): T {
  return demoContextStorage.run(context, fn)
}
