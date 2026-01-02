/**
 * Context Agent
 *
 * Creates Mastra agent for inferring app context from a DemokitSchema.
 * This agent analyzes the schema structure to understand what kind of
 * application the API represents and its key domain concepts.
 *
 * @license Apache-2.0
 * @module
 */

import { Agent } from '@mastra/core/agent'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import type { DemokitSchema } from '../../schema'
import type { AppContext } from '../../codegen'

// ============================================================================
// Zod Schemas for Structured Output
// ============================================================================

/**
 * Zod schema for EntityContext
 */
export const EntityContextSchema = z.object({
  name: z.string().describe('Entity/model name'),
  purpose: z.string().describe('What this entity represents in the domain'),
  keyFields: z.array(z.string()).describe('Most important fields for this entity'),
  businessRules: z.array(z.string()).optional().describe('Business rules that apply'),
})

/**
 * Zod schema for AppContext
 */
export const AppContextSchema = z.object({
  name: z.string().describe('Application name (inferred from API title or schema)'),
  description: z.string().describe('What the application does'),
  domain: z.string().describe('Domain category (e.g., e-commerce, b2b-saas, project-management)'),
  keyEntities: z.array(EntityContextSchema).describe('Main entities and their purposes'),
  features: z.array(z.string()).describe('Key features/capabilities of the application'),
})

// ============================================================================
// Agent Factory
// ============================================================================

/**
 * Create a context inference agent
 *
 * This agent analyzes a DemokitSchema and infers:
 * - What kind of application the API represents
 * - The domain it operates in
 * - Key entities and their business purposes
 * - Main features and capabilities
 *
 * @returns Configured Mastra Agent instance
 *
 * @example
 * ```typescript
 * const agent = createContextAgent()
 * const schema = await importFromOpenAPI('./openapi.yaml')
 *
 * const result = await agent.generate(
 *   `Analyze this schema and infer the app context: ${JSON.stringify(schema)}`,
 *   { output: AppContextSchema }
 * )
 *
 * console.log(result.object.domain) // e.g., "e-commerce"
 * ```
 */
export function createContextAgent(): Agent {
  return new Agent({
    id: 'demokit-context-agent',
    name: 'demokit-context-agent',
    instructions: `You are an API analyst that understands application domains.

Given an API schema (with models, endpoints, and relationships), your job is to infer:

1. **Application Name**: What is this app called? Use the API title if available, otherwise infer from the domain.

2. **Description**: What does this application do? Write 1-2 sentences describing its purpose.

3. **Domain**: Categorize the application domain. Common domains include:
   - e-commerce (shopping, products, orders, carts)
   - b2b-saas (subscriptions, tenants, billing)
   - project-management (tasks, projects, teams)
   - social-media (users, posts, followers)
   - healthcare (patients, appointments, records)
   - fintech (accounts, transactions, payments)
   - education (courses, students, enrollments)
   - logistics (shipments, inventory, warehouses)

4. **Key Entities**: For each important model, explain:
   - Its purpose in the domain
   - Key fields to focus on for demo data
   - Any business rules (e.g., "orders must have at least one item")

5. **Features**: What can users do with this application? List 3-5 main capabilities.

Be concise but insightful. Focus on what makes this API unique.`,
    model: anthropic('claude-sonnet-4-20250514'),
  })
}

/**
 * Infer app context from a schema using the context agent
 *
 * Convenience function that creates an agent and runs inference.
 *
 * @param schema - Parsed DemokitSchema
 * @returns Inferred AppContext
 *
 * @example
 * ```typescript
 * const schema = await importFromOpenAPI('./openapi.yaml')
 * const context = await inferAppContextWithAgent(schema)
 * console.log(context.domain) // e.g., "e-commerce"
 * ```
 */
export async function inferAppContextWithAgent(schema: DemokitSchema): Promise<AppContext> {
  const agent = createContextAgent()

  // Build a condensed schema summary for the prompt
  const schemaSummary = {
    title: schema.info.title,
    description: schema.info.description,
    models: Object.entries(schema.models).map(([name, model]) => ({
      name,
      description: model.description,
      fields: Object.keys(model.properties || {}),
      required: model.required,
    })),
    relationships: schema.relationships.map((rel) => ({
      from: `${rel.from.model}.${rel.from.field}`,
      to: `${rel.to.model}.${rel.to.field}`,
      type: rel.type,
    })),
    endpoints: schema.endpoints.slice(0, 20).map((ep) => ({
      method: ep.method,
      path: ep.path,
      summary: ep.summary,
    })),
  }

  const result = await agent.generate(
    `Analyze this API schema and infer the application context:\n\n${JSON.stringify(schemaSummary, null, 2)}`,
    { structuredOutput: { schema: AppContextSchema } }
  )

  return result.object as AppContext
}
