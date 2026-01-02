/**
 * Narrative Agent
 *
 * Creates schema-guided Mastra agent for narrative-driven data generation.
 * The agent receives the parsed DemokitSchema as context in its instructions,
 * ensuring generated data matches the exact field types, formats, and relationships.
 *
 * @module
 */

import { Agent } from '@mastra/core/agent'
import { anthropic } from '@ai-sdk/anthropic'
import type { DemokitSchema, DataModel } from '@demokit-ai/core'

// ============================================================================
// Schema Context Builder
// ============================================================================

/**
 * Build schema context for agent instructions
 *
 * Formats the DemokitSchema into a structured prompt section that includes:
 * - All data models with their fields and types
 * - Field constraints (format, enum, min/max, pattern)
 * - Relationship mappings (foreign keys)
 * - Generation rules
 *
 * @param schema - Parsed DemokitSchema from Phase 1
 * @returns Formatted context string for agent instructions
 */
export function buildSchemaContext(schema: DemokitSchema): string {
  const modelDescriptions = Object.entries(schema.models)
    .map(([name, model]) => formatModelForPrompt(name, model))
    .join('\n\n')

  const relationshipDescriptions = schema.relationships
    .map(
      (rel) =>
        `- ${rel.from.model}.${rel.from.field} → ${rel.to.model}.${rel.to.field} (${rel.type})`
    )
    .join('\n')

  return `
## Data Models

${modelDescriptions}

## Relationships (Foreign Keys)

${relationshipDescriptions || 'No relationships detected.'}

## Generation Rules

1. Every foreign key field MUST reference an existing record's ID
2. Generate parent records BEFORE children (topological order)
3. Respect all type constraints (format, enum, min/max, pattern)
4. Required fields cannot be null or omitted
5. Use realistic, contextually appropriate values
`
}

/**
 * Format a single model for the agent prompt
 *
 * @param name - Model name
 * @param model - DataModel definition
 * @returns Formatted model description
 */
function formatModelForPrompt(name: string, model: DataModel): string {
  const fields = Object.entries(model.properties || {})
    .map(([fieldName, prop]) => {
      const constraints: string[] = []

      if (prop.format) constraints.push(`format: ${prop.format}`)
      if (prop.enum) constraints.push(`enum: [${prop.enum.join(', ')}]`)
      if (prop.minimum !== undefined) constraints.push(`min: ${prop.minimum}`)
      if (prop.maximum !== undefined) constraints.push(`max: ${prop.maximum}`)
      if (prop.minLength !== undefined) constraints.push(`minLength: ${prop.minLength}`)
      if (prop.maxLength !== undefined) constraints.push(`maxLength: ${prop.maxLength}`)
      if (prop.pattern) constraints.push(`pattern: ${prop.pattern}`)
      if (prop.relationshipTo) {
        constraints.push(`FK → ${prop.relationshipTo.model}.${prop.relationshipTo.field}`)
      }

      const required = model.required?.includes(fieldName) ? '(required)' : '(optional)'
      const constraintStr = constraints.length ? ` [${constraints.join(', ')}]` : ''

      return `  - ${fieldName}: ${prop.type}${constraintStr} ${required}`
    })
    .join('\n')

  const description = model.description ? `\n${model.description}` : ''

  return `### ${name}${description}\n${fields}`
}

// ============================================================================
// Agent Factory
// ============================================================================

/**
 * Create a narrative agent with schema-aware instructions
 *
 * The agent is configured with:
 * - Full schema context in instructions
 * - Claude Sonnet model for balanced quality/speed
 * - Structured output support
 *
 * @param schema - Parsed DemokitSchema
 * @returns Configured Mastra Agent instance
 *
 * @example
 * ```typescript
 * const schema = await importFromOpenAPI('./openapi.yaml')
 * const agent = createNarrativeAgent(schema)
 *
 * const result = await agent.generate(
 *   'Generate demo data for an e-commerce store with 3 customers and 5 orders',
 *   { output: outputSchema }
 * )
 * ```
 */
export function createNarrativeAgent(schema: DemokitSchema): Agent {
  const schemaContext = buildSchemaContext(schema)

  return new Agent({
    id: 'demokit-narrative-agent',
    name: 'DemoKit Narrative Agent',
    instructions: `You are a demo data generator that creates realistic, story-driven fixture data.

${schemaContext}

Your output MUST:
1. Match the exact field types and formats specified above
2. Satisfy all foreign key relationships (reference valid IDs)
3. Pass validation against the schema constraints
4. Tell a coherent story based on the user's narrative
5. Use realistic values that make sense in context

CRITICAL ID REQUIREMENTS:
- Every record MUST have a UNIQUE ID - no two records in the same model can share the same ID
- Use UUID format for IDs (e.g., "550e8400-e29b-41d4-a716-446655440000")
- Generate a NEW, DIFFERENT UUID for each record - NEVER reuse the same ID
- Foreign key fields must reference IDs that exist in the related model

Output JSON matching this structure:
{
  "ModelName": [{ ...record1 }, { ...record2 }],
  "AnotherModel": [{ ...record1 }]
}

IMPORTANT: Each record must have its own unique UUID. Do NOT copy the same record multiple times.`,
    model: anthropic('claude-sonnet-4-20250514'),
  })
}
