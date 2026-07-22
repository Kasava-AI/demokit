import { setupWorker, type SetupWorker } from 'msw/browser'
import type { ResolveDeps } from '@demokit-ai/core'
import { createMswRequestHandler } from './handler'
import { attachBypassObserver, type BypassResponseInfo } from './bypass-observer'

export { createMswRequestHandler } from './handler'

export interface MswTransport {
  start(): Promise<void>
  stop(): void
  setDeps(deps: ResolveDeps | null): void
}

export interface MswTransportOptions {
  workerUrl?: string
  startTimeoutMs?: number
  /**
   * Raw observation hook: fired for every request msw bypassed straight to
   * the real network (msw's `response:bypass` life-cycle event). Subscribed
   * at construction, so it observes bypassed responses for this transport's
   * whole lifetime; unsubscribed (inert) once `stop()` runs. The transport
   * does not derive a shape from the response itself — that's provider
   * policy — it only forwards the `{request, response}` pair.
   */
  onBypassResponse?: (info: BypassResponseInfo) => void
}

export function createMswTransport(options: MswTransportOptions = {}): MswTransport {
  const { workerUrl = '/mockServiceWorker.js', startTimeoutMs = 5000, onBypassResponse } = options
  let deps: ResolveDeps | null = null
  const worker: SetupWorker = setupWorker(createMswRequestHandler(() => deps))

  // Subscribed here (construction), not inside start() — the hook observes
  // bypassed responses regardless of start()/stop() churn timing, mirroring
  // deps' own construction-time wiring below. detach() runs in stop() so a
  // stopped transport is fully inert.
  const bypassObserver = onBypassResponse ? attachBypassObserver(worker.events, onBypassResponse) : null

  return {
    async start() {
      // A missing or version-stale mockServiceWorker.js surfaces as a start
      // rejection or a hang; both must fail loudly into `unavailable` rather
      // than half-mocking (spec §7/§10). Timeout converts the hang case.
      let timer: ReturnType<typeof setTimeout> | undefined
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`[DemoKit] MSW worker failed to start within ${startTimeoutMs}ms — is ${workerUrl} present and current?`)),
          startTimeoutMs
        )
      })
      try {
        await Promise.race([
          worker.start({ quiet: true, onUnhandledRequest: 'bypass', serviceWorker: { url: workerUrl } }),
          timeout,
        ])
      } finally {
        clearTimeout(timer)
      }
    },
    stop() {
      bypassObserver?.detach()
      worker.stop()
    },
    setDeps(next) { deps = next },
  }
}
