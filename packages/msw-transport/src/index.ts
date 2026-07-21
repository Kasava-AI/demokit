import { setupWorker, type SetupWorker } from 'msw/browser'
import type { ResolveDeps } from '@demokit-ai/core'
import { createMswRequestHandler } from './handler'

export { createMswRequestHandler } from './handler'

export interface MswTransport {
  start(): Promise<void>
  stop(): void
  setDeps(deps: ResolveDeps | null): void
}

export interface MswTransportOptions {
  workerUrl?: string
  startTimeoutMs?: number
}

export function createMswTransport(options: MswTransportOptions = {}): MswTransport {
  const { workerUrl = '/mockServiceWorker.js', startTimeoutMs = 5000 } = options
  let deps: ResolveDeps | null = null
  const worker: SetupWorker = setupWorker(createMswRequestHandler(() => deps))

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
    stop() { worker.stop() },
    setDeps(next) { deps = next },
  }
}
