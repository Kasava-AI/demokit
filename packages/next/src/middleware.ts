/**
 * Middleware exports for @demokit-ai/next
 *
 * Import from '@demokit-ai/next/middleware' in your middleware.ts file.
 *
 * @example
 * // middleware.ts
 * import { demoMiddleware } from '@demokit-ai/next/middleware'
 *
 * export const middleware = demoMiddleware()
 *
 * export const config = {
 *   matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
 * }
 */

export {
  createDemoMiddleware,
  demoMiddleware,
  isDemoRequest,
  getDemoScenario,
} from './server/middleware'

export type { DemoMiddlewareConfig, MiddlewareResult } from './types'
