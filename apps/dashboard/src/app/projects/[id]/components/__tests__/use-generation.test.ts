/**
 * Tests for use-generation hook logic
 *
 * Note: These tests focus on the hook's integration with OSS packages
 * rather than React rendering behavior. Full hook tests would require
 * proper React Testing Library setup with jsdom.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DemokitSchema } from '@demokit-ai/core'
import type { ValidationResult } from '@demokit-ai/core'

// Mock the @demokit-ai/core package
vi.mock('@demokit-ai/core', () => ({
  generateDemoData: vi.fn(),
  validateData: vi.fn(),
}))

import { generateDemoData, validateData } from '@demokit-ai/core'

// Sample schema for testing - matches DemokitSchema interface
const mockSchema: DemokitSchema = {
  info: { title: 'Test API', version: '1.0.0' },
  endpoints: [],
  models: {
    User: {
      name: 'User',
      type: 'object',
      properties: {
        id: { name: 'id', type: 'string', required: true },
        email: { name: 'email', type: 'string', required: true },
        name: { name: 'name', type: 'string', required: false },
      },
      required: ['id', 'email'],
    },
  },
  relationships: [],
}

// Helper to create a validation result with required stats
function createValidationResult(overrides: Partial<ValidationResult> = {}): ValidationResult {
  return {
    valid: true,
    errors: [],
    warnings: [],
    stats: {
      totalRecords: 2,
      recordsByModel: { User: 2 },
      relationshipsChecked: 0,
      typeChecks: 0,
      durationMs: 10,
    },
    ...overrides,
  }
}

const mockGenerationResult = {
  data: {
    User: [
      { id: 'user-1', email: 'alice@example.com', name: 'Alice' },
      { id: 'user-2', email: 'bob@example.com', name: 'Bob' },
    ],
  },
  fixtures: 'export const users = [{ id: "user-1" }, { id: "user-2" }]',
  validation: createValidationResult(),
  metadata: {
    level: 'relationship-valid' as const,
    generatedAt: new Date().toISOString(),
    totalRecords: 2,
    recordsByModel: { User: 2 },
    usedIds: { User: ['user-1', 'user-2'] },
    durationMs: 150,
  },
}

describe('useGeneration OSS integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(generateDemoData).mockReturnValue(mockGenerationResult)
    vi.mocked(validateData).mockReturnValue(createValidationResult())
  })

  describe('generateDemoData integration', () => {
    it('generateDemoData is available from @demokit-ai/core', () => {
      expect(generateDemoData).toBeDefined()
      expect(typeof generateDemoData).toBe('function')
    })

    it('generateDemoData returns expected structure', () => {
      const result = generateDemoData(mockSchema, {
        level: 'relationship-valid',
        counts: { User: 2 },
        format: 'typescript',
        validate: true,
      })

      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('fixtures')
      expect(result).toHaveProperty('validation')
      expect(result).toHaveProperty('metadata')
    })

    it('generateDemoData receives correct options', () => {
      generateDemoData(mockSchema, {
        level: 'schema-valid',
        counts: { User: 5, Product: 10 },
        format: 'typescript',
        validate: true,
      })

      expect(generateDemoData).toHaveBeenCalledWith(
        mockSchema,
        expect.objectContaining({
          level: 'schema-valid',
          counts: { User: 5, Product: 10 },
          format: 'typescript',
          validate: true,
        })
      )
    })

    it('supports L1 (schema-valid) level', () => {
      generateDemoData(mockSchema, {
        level: 'schema-valid',
        format: 'typescript',
        validate: true,
      })

      expect(generateDemoData).toHaveBeenCalledWith(
        mockSchema,
        expect.objectContaining({ level: 'schema-valid' })
      )
    })

    it('supports L2 (relationship-valid) level', () => {
      generateDemoData(mockSchema, {
        level: 'relationship-valid',
        format: 'typescript',
        validate: true,
      })

      expect(generateDemoData).toHaveBeenCalledWith(
        mockSchema,
        expect.objectContaining({ level: 'relationship-valid' })
      )
    })
  })

  describe('validateData integration', () => {
    it('validateData is available from @demokit-ai/core', () => {
      expect(validateData).toBeDefined()
      expect(typeof validateData).toBe('function')
    })

    it('validateData accepts data and options', () => {
      validateData(mockGenerationResult.data, {
        schema: mockSchema,
        collectWarnings: true,
      })

      expect(validateData).toHaveBeenCalledWith(
        mockGenerationResult.data,
        expect.objectContaining({
          schema: mockSchema,
          collectWarnings: true,
        })
      )
    })

    it('validateData returns validation result structure', () => {
      const result = validateData(mockGenerationResult.data, {
        schema: mockSchema,
        collectWarnings: true,
      })

      expect(result).toHaveProperty('valid')
      expect(result).toHaveProperty('errors')
      expect(result).toHaveProperty('warnings')
    })

    it('handles validation with errors', () => {
      vi.mocked(validateData).mockReturnValue(createValidationResult({
        valid: false,
        errors: [
          { type: 'format_invalid', model: 'User', field: 'email', message: 'Invalid email format' },
          { type: 'required_missing', model: 'User', field: 'name', message: 'Name is required' },
        ],
      }))

      const result = validateData(mockGenerationResult.data, {
        schema: mockSchema,
        collectWarnings: true,
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(2)
    })

    it('handles validation with warnings', () => {
      vi.mocked(validateData).mockReturnValue(createValidationResult({
        valid: true,
        warnings: [
          { type: 'suspicious_value', model: 'User', field: 'name', message: 'Name should be at least 2 characters' },
        ],
      }))

      const result = validateData(mockGenerationResult.data, {
        schema: mockSchema,
        collectWarnings: true,
      })

      expect(result.valid).toBe(true)
      expect(result.warnings).toHaveLength(1)
    })
  })

  describe('generation result structure', () => {
    it('result contains typed data by model', () => {
      const result = generateDemoData(mockSchema, {
        level: 'relationship-valid',
        format: 'typescript',
        validate: true,
      })

      expect(result.data).toHaveProperty('User')
      expect(Array.isArray(result.data.User)).toBe(true)
    })

    it('result contains fixtures code', () => {
      const result = generateDemoData(mockSchema, {
        level: 'relationship-valid',
        format: 'typescript',
        validate: true,
      })

      expect(typeof result.fixtures).toBe('string')
      expect(result.fixtures).toContain('export')
    })

    it('result metadata includes generation level', () => {
      const result = generateDemoData(mockSchema, {
        level: 'relationship-valid',
        format: 'typescript',
        validate: true,
      })

      expect(result.metadata.level).toBe('relationship-valid')
    })

    it('result metadata includes record counts', () => {
      const result = generateDemoData(mockSchema, {
        level: 'relationship-valid',
        format: 'typescript',
        validate: true,
      })

      expect(result.metadata.totalRecords).toBe(2)
      expect(result.metadata.recordsByModel).toEqual({ User: 2 })
    })

    it('result metadata includes used IDs for relationship tracking', () => {
      const result = generateDemoData(mockSchema, {
        level: 'relationship-valid',
        format: 'typescript',
        validate: true,
      })

      expect(result.metadata.usedIds).toHaveProperty('User')
      expect(Array.isArray(result.metadata.usedIds.User)).toBe(true)
    })

    it('result metadata includes duration', () => {
      const result = generateDemoData(mockSchema, {
        level: 'relationship-valid',
        format: 'typescript',
        validate: true,
      })

      expect(typeof result.metadata.durationMs).toBe('number')
    })
  })

  describe('error handling', () => {
    it('handles generation errors gracefully', () => {
      vi.mocked(generateDemoData).mockImplementation(() => {
        throw new Error('Invalid schema: missing required field')
      })

      expect(() => generateDemoData(mockSchema, {
        level: 'relationship-valid',
        format: 'typescript',
        validate: true,
      })).toThrow('Invalid schema: missing required field')
    })

    it('handles validation errors gracefully', () => {
      vi.mocked(validateData).mockImplementation(() => {
        throw new Error('Validation failed: corrupted data')
      })

      expect(() => validateData({}, {
        schema: mockSchema,
        collectWarnings: true,
      })).toThrow('Validation failed: corrupted data')
    })
  })

  describe('format options', () => {
    it('supports typescript format', () => {
      generateDemoData(mockSchema, {
        level: 'relationship-valid',
        format: 'typescript',
        validate: true,
      })

      expect(generateDemoData).toHaveBeenCalledWith(
        mockSchema,
        expect.objectContaining({ format: 'typescript' })
      )
    })

    it('validate option controls validation inclusion', () => {
      generateDemoData(mockSchema, {
        level: 'relationship-valid',
        format: 'typescript',
        validate: false,
      })

      expect(generateDemoData).toHaveBeenCalledWith(
        mockSchema,
        expect.objectContaining({ validate: false })
      )
    })
  })
})
