import type { SetupWorker } from 'msw/browser'

/**
 * The raw {request, response} pair for a request msw bypassed straight to
 * the real network (msw's `response:bypass` life-cycle event). The
 * transport does not derive a shape from this itself — that's provider
 * policy (Task 4) — it only forwards the pair as-is.
 */
export interface BypassResponseInfo {
  request: Request
  response: Response
}

/**
 * Structural shape both `worker.events` (msw/browser) and `server.events`
 * (msw/node) satisfy — msw's `LifeCycleEventEmitter` is the exact same type
 * across both environments, so this can be driven by either one. Node
 * tests use `setupServer(...).events` as a stand-in for the browser
 * worker's emitter, since a real Service Worker can't run under Node.
 */
export type BypassEvents = SetupWorker['events']

export interface BypassObserver {
  /** Unsubscribes — inert afterward, no further callbacks. */
  detach(): void
}

/**
 * Subscribes to msw's `response:bypass` life-cycle event and forwards every
 * bypassed (real network) response to `onBypassResponse`.
 *
 * The callback runs inside a try/catch: this listener is a pure observation
 * side channel, fired after msw has already resolved the response to the
 * original caller, so a throwing consumer must never surface there.
 */
export function attachBypassObserver(
  events: BypassEvents,
  onBypassResponse: (info: BypassResponseInfo) => void
): BypassObserver {
  const listener = ({ request, response }: BypassResponseInfo) => {
    try {
      onBypassResponse({ request, response })
    } catch {
      // Contained — see doc comment above.
    }
  }
  events.on('response:bypass', listener)
  return {
    detach() {
      events.removeListener('response:bypass', listener)
    },
  }
}
