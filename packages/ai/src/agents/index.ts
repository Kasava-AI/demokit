/**
 * Mastra Agents
 *
 * Schema-guided AI agents for demo data generation.
 *
 * @module
 */

export {
  createNarrativeAgent,
  buildSchemaContext,
  type CreateNarrativeAgentOptions,
} from './narrative-agent'

export {
  createContextAgent,
  inferAppContextWithAgent,
  AppContextSchema,
  EntityContextSchema,
} from './context-agent'

export {
  createMappingValidatorAgent,
  validateEndpointMappings,
  inferAndValidateMappings,
  buildValidationPrompt,
  MappingValidationResultSchema,
  ValidatedMappingSchema,
  ValidationErrorSchema,
  MappingStatusSchema,
  type MappingValidationResult,
  type ValidatedMapping,
  type ValidationError,
  type MappingStatus,
} from './mapping-validator-agent'
