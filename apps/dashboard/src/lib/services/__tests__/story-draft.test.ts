/**
 * Tests for createStoryDraftGeneration (Phase 4 Task 8) — the extracted
 * persistence logic shared by the dashboard's generate-story route and,
 * later, DemoKit Cloud's CI auto-fill (Task 13).
 *
 * These are the parity oracle for the dashboard's
 * source: 'dashboard' + allowBootstrapPublish: true path (today's
 * behavior, byte-preserved) and the new CI semantics:
 * allowBootstrapPublish: false must skip the bootstrap-publish branch
 * entirely and ALWAYS populate unreviewedRows — CI fills are unreviewed by
 * definition (spec §9.3 never-auto-publish).
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { StorySpec, DemokitSchema, GenerationResult } from '@demokit-ai/core'

const mockGenerateFromStorySpec = vi.fn()
vi.mock('@demokit-ai/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@demokit-ai/core')>()
  return {
    ...actual,
    generateFromStorySpec: (...args: unknown[]) => mockGenerateFromStorySpec(...args),
  }
})

const mockBuildNarrativeSample = vi.fn()
const mockRunNarrativeLinter = vi.fn()
vi.mock('@demokit-ai/ai', () => ({
  buildNarrativeSample: (...args: unknown[]) => mockBuildNarrativeSample(...args),
  runNarrativeLinter: (...args: unknown[]) => mockRunNarrativeLinter(...args),
}))

import { createStoryDraftGeneration, type StoryDraftInput } from '../story-draft'
import { fixtureGenerations, fixtures, publishes } from '@db'

const schema: DemokitSchema = {
  models: { Customer: { properties: { tier: {} } } },
  relationships: [],
}

const spec: StorySpec = {
  version: 1,
  scenario: 'A churn-risk enterprise account',
  seed: 42,
  counts: {},
  pins: [],
  anchors: [],
  trends: [],
  events: [],
  fieldRules: {},
}

function makeGenerationResult(overrides: Partial<GenerationResult> = {}): GenerationResult {
  return {
    data: { Customer: [{ id: 'c1' }, { id: 'c2' }] },
    validation: { valid: true, errors: [], warnings: [], stats: { totalRecords: 2, recordsByModel: { Customer: 2 }, relationshipsChecked: 0, typeChecks: 0, durationMs: 1 } },
    metadata: { level: 'relationship-valid', generatedAt: new Date().toISOString(), totalRecords: 2, recordsByModel: { Customer: 2 }, usedIds: {}, durationMs: 1 },
    ...overrides,
  }
}

/**
 * A minimal drizzle-shaped mock: a fixture lookup, an insert().values().returning()
 * chain that mints incrementing generation ids, an update().set().where() chain,
 * and a transaction(fn) that hands the callback a `tx` with the same insert/update
 * shape (matching the route's original persistence calls exactly).
 */
function createMockDb(fixture: { id: string; publishedGenerationId: string | null } | null) {
  const findFirstFixtures = vi.fn().mockResolvedValue(fixture)

  let generationCounter = 0
  const insertReturning = vi.fn()
  const insertValues = vi.fn((values: Record<string, unknown>) => {
    const id = `gen-${++generationCounter}`
    insertReturning.mockResolvedValueOnce([{ id, ...values }])
    return { returning: insertReturning }
  })
  const insert = vi.fn((_table: unknown) => ({ values: insertValues }))

  const updateWhere = vi.fn().mockResolvedValue(undefined)
  const updateSet = vi.fn(() => ({ where: updateWhere }))
  const update = vi.fn((_table: unknown) => ({ set: updateSet }))

  const txInsertValues = vi.fn().mockResolvedValue(undefined)
  const txInsert = vi.fn((_table: unknown) => ({ values: txInsertValues }))
  const txUpdateWhere = vi.fn().mockResolvedValue(undefined)
  const txUpdateSet = vi.fn(() => ({ where: txUpdateWhere }))
  const txUpdate = vi.fn((_table: unknown) => ({ set: txUpdateSet }))
  const tx = { insert: txInsert, update: txUpdate }

  const transaction = vi.fn(async (fn: (tx: typeof tx) => Promise<void>) => fn(tx))

  const db = {
    query: { fixtures: { findFirst: findFirstFixtures } },
    insert,
    update,
    transaction,
  }

  return {
    db: db as unknown as StoryDraftInput['db'],
    findFirstFixtures,
    insert,
    insertValues,
    update,
    updateSet,
    updateWhere,
    transaction,
    txInsert,
    txInsertValues,
    txUpdate,
    txUpdateSet,
    txUpdateWhere,
  }
}

describe('createStoryDraftGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.ANTHROPIC_API_KEY
    mockGenerateFromStorySpec.mockReturnValue(makeGenerationResult())
  })

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY
  })

  it('dashboard path parity: marks rows unreviewed and updates the draft pointer when a generation is already published', async () => {
    const mock = createMockDb({ id: 'fixture-1', publishedGenerationId: 'gen-existing' })

    const result = await createStoryDraftGeneration({
      db: mock.db,
      projectId: 'project-1',
      fixtureId: 'fixture-1',
      schema,
      spec,
      source: 'dashboard',
      allowBootstrapPublish: true,
      publishedById: 'user-1',
    })

    expect(mock.insert).toHaveBeenCalledWith(fixtureGenerations)
    expect(mock.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'dashboard',
        unreviewedRows: { Customer: ['c1', 'c2'] },
      })
    )

    // Draft pointer update — no bootstrap publish since something is already published.
    expect(mock.transaction).not.toHaveBeenCalled()
    expect(mock.update).toHaveBeenCalledWith(fixtures)
    expect(mock.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ draftGenerationId: 'gen-1' })
    )

    expect(result).toEqual({
      generationId: 'gen-1',
      warnings: [],
      linterFindings: [],
      unreviewedRowCount: 2,
    })
  })

  it('dashboard path: bootstrap-publishes the first valid generation when nothing has published yet', async () => {
    const mock = createMockDb({ id: 'fixture-1', publishedGenerationId: null })

    const result = await createStoryDraftGeneration({
      db: mock.db,
      projectId: 'project-1',
      fixtureId: 'fixture-1',
      schema,
      spec,
      source: 'dashboard',
      allowBootstrapPublish: true,
      publishedById: 'user-1',
    })

    // No published generation yet + valid + allowBootstrapPublish -> unreviewedRows stays null.
    expect(mock.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'dashboard', unreviewedRows: null })
    )

    expect(mock.transaction).toHaveBeenCalledTimes(1)
    expect(mock.txInsert).toHaveBeenCalledWith(publishes)
    expect(mock.txInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        fixtureId: 'fixture-1',
        generationId: 'gen-1',
        previousGenerationId: null,
        publishedById: 'user-1',
        note: 'initial publish',
      })
    )
    expect(mock.txUpdate).toHaveBeenCalledWith(fixtures)
    expect(mock.txUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ publishedGenerationId: 'gen-1' })
    )

    // The non-transactional draft-pointer update must NOT also fire.
    expect(mock.update).not.toHaveBeenCalled()

    expect(result.unreviewedRowCount).toBe(0)
  })

  it('ci_fill + allowBootstrapPublish: false never publishes, even when nothing has published yet, and always marks rows unreviewed', async () => {
    const mock = createMockDb({ id: 'fixture-1', publishedGenerationId: null })
    mockGenerateFromStorySpec.mockReturnValue(makeGenerationResult({
      validation: { valid: true, errors: [], warnings: [], stats: { totalRecords: 2, recordsByModel: { Customer: 2 }, relationshipsChecked: 0, typeChecks: 0, durationMs: 1 } },
    }))

    const result = await createStoryDraftGeneration({
      db: mock.db,
      projectId: 'project-1',
      fixtureId: 'fixture-1',
      schema,
      spec,
      source: 'ci_fill',
      allowBootstrapPublish: false,
    })

    // CI fills are unreviewed by definition, even on a never-published fixture.
    expect(mock.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'ci_fill',
        unreviewedRows: { Customer: ['c1', 'c2'] },
      })
    )

    // The bootstrap-publish branch must never run for CI.
    expect(mock.transaction).not.toHaveBeenCalled()

    // Instead, the draft pointer update runs.
    expect(mock.update).toHaveBeenCalledWith(fixtures)
    expect(mock.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ draftGenerationId: 'gen-1' })
    )

    expect(result.unreviewedRowCount).toBe(2)
  })

  it('ci_fill + allowBootstrapPublish: false never publishes on an already-published fixture either — no publish write of any kind', async () => {
    const mock = createMockDb({ id: 'fixture-1', publishedGenerationId: 'gen-existing' })
    mockGenerateFromStorySpec.mockReturnValue(makeGenerationResult({
      validation: { valid: true, errors: [], warnings: [], stats: { totalRecords: 2, recordsByModel: { Customer: 2 }, relationshipsChecked: 0, typeChecks: 0, durationMs: 1 } },
    }))

    const result = await createStoryDraftGeneration({
      db: mock.db,
      projectId: 'project-1',
      fixtureId: 'fixture-1',
      schema,
      spec,
      source: 'ci_fill',
      allowBootstrapPublish: false,
    })

    // CI fills are unreviewed by definition, same as the never-published case.
    expect(mock.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'ci_fill',
        unreviewedRows: { Customer: ['c1', 'c2'] },
      })
    )

    // No publish write of any kind: the transaction (which is the only path
    // that touches `publishes` or `publishedGenerationId`) must never run.
    expect(mock.transaction).not.toHaveBeenCalled()
    expect(mock.txInsert).not.toHaveBeenCalled()
    expect(mock.txInsertValues).not.toHaveBeenCalled()
    expect(mock.txUpdate).not.toHaveBeenCalled()

    // Only the draft pointer moves — publishedGenerationId is left untouched
    // (the mock db never even receives a `publishedGenerationId` write).
    expect(mock.update).toHaveBeenCalledWith(fixtures)
    expect(mock.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ draftGenerationId: 'gen-1' })
    )
    expect(mock.updateSet).not.toHaveBeenCalledWith(
      expect.objectContaining({ publishedGenerationId: expect.anything() })
    )

    expect(result.unreviewedRowCount).toBe(2)
  })

  it('swallows a narrative linter failure to an empty array and does not throw', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    const mock = createMockDb({ id: 'fixture-1', publishedGenerationId: 'gen-existing' })
    mockBuildNarrativeSample.mockReturnValue({ scenario: spec.scenario, models: {} })
    mockRunNarrativeLinter.mockRejectedValue(new Error('linter blew up'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await createStoryDraftGeneration({
      db: mock.db,
      projectId: 'project-1',
      fixtureId: 'fixture-1',
      schema,
      spec,
      source: 'dashboard',
      allowBootstrapPublish: true,
      publishedById: 'user-1',
    })

    expect(result.linterFindings).toEqual([])
    expect(warnSpy).toHaveBeenCalled()
    // The linterFindings-only update must not have been attempted after a throw.
    expect(mock.updateSet).not.toHaveBeenCalledWith(
      expect.objectContaining({ linterFindings: expect.anything() })
    )

    warnSpy.mockRestore()
  })

  it('persists linter findings and returns them when the linter succeeds', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    const mock = createMockDb({ id: 'fixture-1', publishedGenerationId: 'gen-existing' })
    mockBuildNarrativeSample.mockReturnValue({ scenario: spec.scenario, models: {} })
    const findings = [{ severity: 'warning' as const, message: 'Story lacks a resolution beat', path: 'events' }]
    mockRunNarrativeLinter.mockResolvedValue(findings)

    const result = await createStoryDraftGeneration({
      db: mock.db,
      projectId: 'project-1',
      fixtureId: 'fixture-1',
      schema,
      spec,
      source: 'dashboard',
      allowBootstrapPublish: true,
      publishedById: 'user-1',
    })

    expect(result.linterFindings).toEqual(findings)
    expect(mock.updateSet).toHaveBeenCalledWith({ linterFindings: findings })
  })

  it('skips the linter entirely when ANTHROPIC_API_KEY is not set', async () => {
    const mock = createMockDb({ id: 'fixture-1', publishedGenerationId: 'gen-existing' })

    await createStoryDraftGeneration({
      db: mock.db,
      projectId: 'project-1',
      fixtureId: 'fixture-1',
      schema,
      spec,
      source: 'dashboard',
      allowBootstrapPublish: true,
      publishedById: 'user-1',
    })

    expect(mockRunNarrativeLinter).not.toHaveBeenCalled()
  })

  it('throws when the fixture cannot be found (tenancy-scoped lookup)', async () => {
    const mock = createMockDb(null)

    await expect(
      createStoryDraftGeneration({
        db: mock.db,
        projectId: 'project-1',
        fixtureId: 'missing-fixture',
        schema,
        spec,
        source: 'ci_fill',
        allowBootstrapPublish: false,
      })
    ).rejects.toThrow('missing-fixture')
  })
})
