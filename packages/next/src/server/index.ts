/**
 * Server-side exports for @demokit-ai/next
 */

export {
  demoContextStorage,
  getServerDemoContext,
  isServerDemoMode,
  getServerScenario,
  runWithDemoContext,
  type ServerDemoContext,
} from './context'

export {
  createServerInterceptor,
  withDemoCheck,
  type ServerInterceptorConfig,
} from './interceptor'

export {
  createDemoMiddleware,
  demoMiddleware,
  isDemoRequest,
  getDemoScenario,
} from './middleware'
