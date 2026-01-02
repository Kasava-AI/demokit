/**
 * Mapping Validator Agent
 *
 * Creates Mastra agent for validating auto-inferred endpoint-to-data mappings.
 * This agent reviews inferred mappings, suggests corrections, and confirms
 * that endpoint patterns correctly map to available fixture data models.
 *
 * @module
 */

import { Agent } from '@mastra/core/agent'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import type { DemokitSchema } from '@demokit-ai/core'
import type { InferredEndpointMapping } from '../lib/schema-to-mappings'

// ============================================================================
// Zod Schemas for Structured Output
// ============================================================================

/**
 * Validation status for each mapping
 */
export const MappingStatusSchema = z.enum([
  'valid', // Mapping is correct as-is
  'corrected', // Mapping was auto-corrected by AI
  'flagged', // Uncertain, needs user review
  'removed', // Endpoint should not be mocked
])

/**
 * A validated endpoint mapping
 */
export const ValidatedMappingSchema = z.object({
  method: z.string().describe('HTTP method (GET, POST, PUT, PATCH, DELETE)'),
  pattern: z.string().describe('URL pattern with :param placeholders'),
  sourceModel: z.string().describe('Key in fixture data to use as source'),
  responseType: z.enum(['collection', 'single', 'custom']).describe('Response type'),
  lookupField: z.string().optional().describe('Field to match against for single records'),
  lookupParam: z.string().optional().describe('URL param name for lookup'),
  status: MappingStatusSchema.describe('Validation status'),
  originalSourceModel: z.string().optional().describe('Original model if corrected'),
  reason: z.string().optional().describe('Explanation for status'),
  confidence: z.number().min(0).max(100).describe('Confidence score (0-100)'),
})

/**
 * An error found during validation
 */
export const ValidationErrorSchema = z.object({
  pattern: z.string().describe('The endpoint pattern with error'),
  method: z.string().describe('HTTP method'),
  errorType: z
    .enum(['missing_model', 'wrong_response_type', 'invalid_lookup', 'orphan_endpoint', 'ambiguous_mapping'])
    .describe('Type of error'),
  message: z.string().describe('Human-readable error message'),
  suggestion: z.string().optional().describe('Suggested fix'),
})

/**
 * Complete validation result
 */
export const MappingValidationResultSchema = z.object({
  isValid: z.boolean().describe('Whether all mappings are valid'),
  overallConfidence: z.number().min(0).max(100).describe('Overall confidence score'),
  mappings: z.array(ValidatedMappingSchema).describe('Validated mappings'),
  errors: z.array(ValidationErrorSchema).describe('Errors found'),
  suggestions: z.array(z.string()).describe('General improvement suggestions'),
})

/**
 * TypeScript types from schemas
 */
export type MappingStatus = z.infer<typeof MappingStatusSchema>
export type ValidatedMapping = z.infer<typeof ValidatedMappingSchema>
export type ValidationError = z.infer<typeof ValidationErrorSchema>
export type MappingValidationResult = z.infer<typeof MappingValidationResultSchema>

// ============================================================================
// Agent Factory
// ============================================================================

/**
 * Create a mapping validator agent
 *
 * This agent validates auto-inferred endpoint-to-data mappings:
 * - Confirms model associations are correct
 * - Corrects mismatched mappings
 * - Flags uncertain mappings for user review
 * - Removes endpoints that shouldn't be mocked
 *
 * @returns Configured Mastra Agent instance
 *
 * @example
 * ```typescript
 * const agent = createMappingValidatorAgent()
 * const result = await agent.generate(
 *   buildValidationPrompt(schema, fixtureModels, inferredMappings),
 *   { output: MappingValidationResultSchema }
 * )
 * ```
 */
export function createMappingValidatorAgent(): Agent {
  return new Agent({
    id: 'demokit-mapping-validator',
    name: 'DemoKit Mapping Validator',
    instructions: `You are an API mapping validator for DemoKit.

Your job is to review auto-inferred endpoint-to-data mappings and validate or correct them.

## Your Tasks

1. **Validate** that each endpoint is correctly mapped to a data model
2. **Correct** any mismatched model associations (e.g., /api/orders mapped to "users" instead of "orders")
3. **Flag** endpoints that don't have obvious data sources
4. **Remove** endpoints that shouldn't return fixture data (health checks, auth, etc.)

## Input Context

You receive:
- The parsed API schema (endpoints, models, relationships)
- The fixture data models available (e.g., users, products, orders)
- The auto-inferred mappings to validate

## Validation Rules

1. **Model matching**:
   - /api/users should map to "users" model, not "User" or "user_accounts"
   - Handle case differences: Users, users, USERS should all map correctly
   - Handle singular/plural: "user" can map to "users" model

2. **Response types**:
   - GET /collection → 'collection' (returns array)
   - GET /collection/:id → 'single' (returns object)
   - POST/PUT/PATCH → 'single' (returns created/updated object)
   - DELETE → 'single' or null

3. **Lookup fields**:
   - Must exist in the model schema
   - Common patterns: id, uuid, slug

4. **Skip these patterns** (mark as 'removed'):
   - /health, /healthz, /ready, /live
   - /auth/*, /login, /logout, /oauth/*
   - /webhook*, /hooks/*
   - /graphql
   - /metrics, /actuator/*
   - /_next/*, /_internal/*
   - /.well-known/*

## Output Guidelines

For each mapping:
- 'valid': Mapping is correct as-is (confidence 90-100)
- 'corrected': You fixed the mapping (include originalSourceModel, confidence 70-90)
- 'flagged': Uncertain, needs user review (confidence < 70)
- 'removed': Should not be mocked (auth, health, etc.)

Be conservative with corrections. If unsure, flag for user review.
Provide clear, actionable suggestions for any errors found.`,
    model: anthropic('claude-sonnet-4-20250514'),
  })
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build a condensed schema summary for the validation prompt
 */
function buildSchemaSummary(schema: DemokitSchema): object {
  return {
    title: schema.info.title,
    description: schema.info.description,
    models: Object.entries(schema.models).map(([name, model]) => ({
      name,
      type: model.type,
      fields: Object.keys(model.properties || {}),
      required: model.required,
    })),
    relationships: schema.relationships.slice(0, 20).map((rel) => ({
      from: `${rel.from.model}.${rel.from.field}`,
      to: `${rel.to.model}.${rel.to.field}`,
      type: rel.type,
    })),
    endpointCount: schema.endpoints.length,
    sampleEndpoints: schema.endpoints.slice(0, 10).map((ep) => ({
      method: ep.method,
      path: ep.path,
      summary: ep.summary,
    })),
  }
}

/**
 * Build the validation prompt for the agent
 */
export function buildValidationPrompt(
  schema: DemokitSchema,
  fixtureModels: string[],
  inferredMappings: InferredEndpointMapping[]
): string {
  const schemaSummary = buildSchemaSummary(schema)

  return `## Available Fixture Models
${fixtureModels.map((m) => `- ${m}`).join('\n')}

## API Schema Summary
${JSON.stringify(schemaSummary, null, 2)}

## Auto-Inferred Mappings to Validate
${JSON.stringify(
  inferredMappings.map((m) => ({
    method: m.method,
    pattern: m.pattern,
    sourceModel: m.sourceModel,
    responseType: m.responseType,
    lookupField: m.lookupField,
    lookupParam: m.lookupParam,
    confidence: m.confidence,
  })),
  null,
  2
)}

Please validate each mapping and return your assessment.
For each mapping, determine if it's valid, needs correction, should be flagged for review, or should be removed.
Provide clear explanations for any corrections or flags.`
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validate endpoint mappings using the AI agent
 *
 * @param schema - The parsed DemokitSchema
 * @param fixtureModels - Available model names from fixture data
 * @param inferredMappings - Auto-inferred mappings to validate
 * @returns Validated mappings with corrections and suggestions
 *
 * @example
 * ```typescript
 * const schema = await importFromOpenAPI('./openapi.yaml')
 * const fixtureModels = ['users', 'products', 'orders']
 * const inferred = inferEndpointMappings(schema, fixtureModels)
 *
 * const validated = await validateEndpointMappings(
 *   schema,
 *   fixtureModels,
 *   inferred.mappings
 * )
 *
 * console.log(validated.mappings.filter(m => m.status === 'corrected'))
 * ```
 */
export async function validateEndpointMappings(
  schema: DemokitSchema,
  fixtureModels: string[],
  inferredMappings: InferredEndpointMapping[]
): Promise<MappingValidationResult> {
  // Skip validation if there are no mappings
  if (inferredMappings.length === 0) {
    return {
      isValid: true,
      overallConfidence: 100,
      mappings: [],
      errors: [],
      suggestions: [],
    }
  }

  const agent = createMappingValidatorAgent()
  const prompt = buildValidationPrompt(schema, fixtureModels, inferredMappings)

  const result = await agent.generate(prompt, {
    structuredOutput: { schema: MappingValidationResultSchema },
  })

  return result.object as MappingValidationResult
}

/**
 * Infer and validate endpoint mappings in a single call
 *
 * This is the main entry point that combines:
 * 1. Auto-inference from schema (fast, heuristic-based)
 * 2. AI validation (slower, smarter corrections)
 *
 * @param schema - The parsed DemokitSchema
 * @param fixtureData - Fixture data object (keys are model names)
 * @returns Validated mappings ready for SDK consumption
 *
 * @example
 * ```typescript
 * const schema = await importFromOpenAPI('./openapi.yaml')
 * const fixtureData = { users: [...], products: [...] }
 *
 * const result = await inferAndValidateMappings(schema, fixtureData)
 *
 * // Use validated mappings
 * for (const mapping of result.mappings) {
 *   if (mapping.status !== 'removed') {
 *     console.log(`${mapping.method} ${mapping.pattern} -> ${mapping.sourceModel}`)
 *   }
 * }
 * ```
 */
export async function inferAndValidateMappings(
  schema: DemokitSchema,
  fixtureData: Record<string, unknown[]>
): Promise<{
  mappings: ValidatedMapping[]
  errors: ValidationError[]
  suggestions: string[]
  overallConfidence: number
}> {
  // Import from ai package's lib
  const { inferEndpointMappings } = await import('../lib/schema-to-mappings')

  // Step 1: Auto-infer from schema
  const fixtureModels = Object.keys(fixtureData)
  const inferred = inferEndpointMappings(schema, fixtureModels)

  // Step 2: Validate with AI agent
  const validation = await validateEndpointMappings(schema, fixtureModels, inferred.mappings)

  // Step 3: Add any unmapped endpoints as flagged items
  const flaggedFromUnmapped: ValidatedMapping[] = inferred.unmapped.map((u) => ({
    method: u.method,
    pattern: u.path,
    sourceModel: u.suggestedModel || 'unknown',
    responseType: 'collection' as const,
    status: 'flagged' as const,
    reason: u.reason,
    confidence: 30,
  }))

  return {
    mappings: [...validation.mappings, ...flaggedFromUnmapped],
    errors: validation.errors,
    suggestions: validation.suggestions,
    overallConfidence: validation.overallConfidence,
  }
}
