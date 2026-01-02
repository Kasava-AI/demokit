'use server'

/**
 * Server Action: Parse OpenAPI Schema
 *
 * Parses an OpenAPI specification (YAML or JSON) and converts it
 * to DemoKit's internal schema format.
 */

import { parseOpenAPIFromObject, type DemokitSchema } from '@demokit-ai/core'
import yaml from 'yaml'

export interface ParseSchemaResult {
  success: boolean
  schema?: DemokitSchema
  error?: string
}

/**
 * Server action to parse an OpenAPI specification string into a DemoKit schema.
 *
 * @param content - The raw OpenAPI spec content (YAML or JSON)
 * @returns ParseSchemaResult with either the parsed schema or an error
 */
export async function parseSchemaAction(content: string): Promise<ParseSchemaResult> {
  try {
    // Try to parse as JSON first, then YAML
    let spec: unknown
    try {
      spec = JSON.parse(content)
    } catch {
      // Not valid JSON, try YAML
      spec = yaml.parse(content)
    }

    if (!spec || typeof spec !== 'object') {
      return {
        success: false,
        error: 'Invalid specification format. Expected a valid OpenAPI YAML or JSON document.',
      }
    }

    // Validate it looks like an OpenAPI spec
    const specObj = spec as Record<string, unknown>
    if (!specObj.openapi && !specObj.swagger) {
      return {
        success: false,
        error: 'Missing "openapi" or "swagger" field. Please provide a valid OpenAPI specification.',
      }
    }

    // Parse using DemoKit core
    const schema = await parseOpenAPIFromObject(spec as Record<string, unknown>)

    return {
      success: true,
      schema,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: `Failed to parse schema: ${message}`,
    }
  }
}
