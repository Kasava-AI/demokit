import { describe, it, expect, vi } from 'vitest'
import { saveWithPinRestore } from '../save-with-pin-restore'
import type { RowEdit } from '../pins-from-edits'
import type { DemoData, StorySpec } from '@demokit-ai/core'

const spec = { pins: [{ path: 'Customer.name', value: 'Old Corp' }] } as unknown as StorySpec
const finalData: DemoData = { Customer: [{ name: 'New Corp' }] }
const edits: RowEdit[] = [{ model: 'Customer', rowIndex: 0, field: 'name', value: 'New Corp' }]

describe('saveWithPinRestore', () => {
  it('creates the generation directly when there is no linked spec', async () => {
    const updateVariantPins = vi.fn().mockResolvedValue(undefined)
    const createGeneration = vi.fn().mockResolvedValue({ id: 'gen-1' })

    const result = await saveWithPinRestore({
      edits,
      finalData,
      spec: null,
      updateVariantPins,
      createGeneration,
    })

    expect(result).toEqual({ id: 'gen-1' })
    expect(updateVariantPins).not.toHaveBeenCalled()
    expect(createGeneration).toHaveBeenCalledTimes(1)
  })

  it('writes the new pins before creating the generation', async () => {
    const calls: string[] = []
    const updateVariantPins = vi.fn().mockImplementation(async () => {
      calls.push('updateVariantPins')
    })
    const createGeneration = vi.fn().mockImplementation(async () => {
      calls.push('createGeneration')
      return { id: 'gen-1' }
    })

    await saveWithPinRestore({ edits, finalData, spec, updateVariantPins, createGeneration })

    expect(calls).toEqual(['updateVariantPins', 'createGeneration'])
    expect(updateVariantPins).toHaveBeenCalledWith([{ path: 'Customer.name', value: 'New Corp' }])
  })

  it('restores the previous pins when draft creation fails after the pin write succeeded', async () => {
    const updateVariantPins = vi.fn().mockResolvedValue(undefined)
    const createError = new Error('create generation failed')
    const createGeneration = vi.fn().mockRejectedValue(createError)
    const onPinsRestoreFailed = vi.fn()

    await expect(
      saveWithPinRestore({ edits, finalData, spec, updateVariantPins, createGeneration, onPinsRestoreFailed })
    ).rejects.toBe(createError)

    expect(updateVariantPins).toHaveBeenCalledTimes(2)
    // First call: the derived pins reflecting the edit.
    expect(updateVariantPins).toHaveBeenNthCalledWith(1, [{ path: 'Customer.name', value: 'New Corp' }])
    // Second call: restored to whatever the spec had before this session.
    expect(updateVariantPins).toHaveBeenNthCalledWith(2, [{ path: 'Customer.name', value: 'Old Corp' }])
    expect(onPinsRestoreFailed).not.toHaveBeenCalled()
  })

  it('does not attempt a restore when there was no linked spec to begin with', async () => {
    const updateVariantPins = vi.fn().mockResolvedValue(undefined)
    const createError = new Error('create generation failed')
    const createGeneration = vi.fn().mockRejectedValue(createError)

    await expect(
      saveWithPinRestore({ edits, finalData, spec: null, updateVariantPins, createGeneration })
    ).rejects.toBe(createError)

    expect(updateVariantPins).not.toHaveBeenCalled()
  })

  it('surfaces onPinsRestoreFailed when both draft creation and the restore attempt fail, but still throws the original error', async () => {
    const createError = new Error('create generation failed')
    const restoreError = new Error('restore failed too')
    const updateVariantPins = vi
      .fn()
      .mockResolvedValueOnce(undefined) // the initial pin write succeeds
      .mockRejectedValueOnce(restoreError) // the compensating restore fails
    const createGeneration = vi.fn().mockRejectedValue(createError)
    const onPinsRestoreFailed = vi.fn()

    await expect(
      saveWithPinRestore({ edits, finalData, spec, updateVariantPins, createGeneration, onPinsRestoreFailed })
    ).rejects.toBe(createError)

    expect(onPinsRestoreFailed).toHaveBeenCalledTimes(1)
  })
})
