import { describe, it, expect, vi, beforeEach } from 'vitest'
import { note } from '@clack/prompts'
import { printSummary } from '../ui/summary'
import type { CliResult } from '../types'

// `printSummary` renders through @clack/prompts' `note()`, which writes
// directly to the terminal. Mock it so we can assert on the string it was
// given instead of parsing captured stdout/ANSI escapes.
vi.mock('@clack/prompts', () => ({
  note: vi.fn(),
}))

function baseResult(overrides: Partial<CliResult> = {}): CliResult {
  return {
    packagesInstalled: [],
    filesChanged: [],
    endpointsDetected: 0,
    framework: 'react',
    ...overrides,
  }
}

const noteMock = vi.mocked(note)

function summaryContent(): string {
  const summaryCall = noteMock.mock.calls.find(([, title]) => title === 'DemoKit Setup Complete')
  expect(summaryCall).toBeTruthy()
  return summaryCall![0] ?? ''
}

describe('printSummary', () => {
  beforeEach(() => {
    noteMock.mockClear()
  })

  it('renders a file description when present — e.g. the msw worker sync note', () => {
    printSummary(
      baseResult({
        filesChanged: [
          {
            path: 'public/mockServiceWorker.js',
            action: 'created',
            description: 'msw worker script — keep this in sync when upgrading msw',
          },
        ],
      }),
      false
    )

    const content = summaryContent()
    expect(content).toContain('public/mockServiceWorker.js')
    expect(content).toContain('keep this in sync when upgrading msw')
  })

  it('renders descriptions for other file kinds too — the mechanism is generic', () => {
    printSummary(
      baseResult({
        filesChanged: [
          { path: 'src/demo/fixtures.ts', action: 'created', description: 'Demo fixtures' },
          { path: 'src/demo/providers.tsx', action: 'skipped', description: 'File already exists' },
        ],
      }),
      false
    )

    const content = summaryContent()
    expect(content).toContain('Demo fixtures')
    expect(content).toContain('File already exists')
  })
})
