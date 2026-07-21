import { http, passthrough, type HttpHandler } from 'msw'
import { resolveRequest, type ResolveDeps } from '@demokit-ai/core'

/**
 * One catch-all handler delegating to the shared resolver, so both
 * transports execute identical resolution in the page (spec §10).
 */
export function createMswRequestHandler(getDeps: () => ResolveDeps | null): HttpHandler {
  return http.all('*', async ({ request }) => {
    const deps = getDeps()
    if (!deps) return passthrough()
    const outcome = await resolveRequest(deps, request)
    return outcome.kind === 'passthrough' ? passthrough() : outcome.response
  })
}
