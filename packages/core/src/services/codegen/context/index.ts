/**
 * Context Module
 *
 * Provides app context inference from OpenAPI schemas.
 * App context helps AI understand what the application does,
 * enabling more relevant narrative-driven data generation.
 *
 * @example
 * ```typescript
 * import { inferAppContext, createAppContext, mergeAppContext } from '@demokit-ai/codegen'
 *
 * // Infer context from schema
 * const context = inferAppContext(schema)
 *
 * // Or create manually
 * const context = createAppContext({ name: 'My App', domain: 'e-commerce' })
 * ```
 *
 * @module
 */

export {
  inferAppContext,
  createAppContext,
  mergeAppContext,
} from './app-context'
