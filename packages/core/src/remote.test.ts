import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchCloudFixtures } from './remote'

const OK_BODY = { data: { users: [] }, mappings: [], version: 'gen-1' }

afterEach(() => vi.unstubAllGlobals())

describe('fetchCloudFixtures preview', () => {
  it('appends demo-preview when previewToken is set', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(OK_BODY), { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)
    await fetchCloudFixtures({ apiKey: 'dk_live_test', apiUrl: 'https://x.test/api', previewToken: 'tok en+1' })
    expect(fetchMock.mock.calls[0]![0]).toBe('https://x.test/api/fixtures?demo-preview=tok%20en%2B1')
  })

  it('builds the bare URL when previewToken is absent', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(OK_BODY), { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)
    await fetchCloudFixtures({ apiKey: 'dk_live_test', apiUrl: 'https://x.test/api' })
    expect(fetchMock.mock.calls[0]![0]).toBe('https://x.test/api/fixtures')
  })
})
