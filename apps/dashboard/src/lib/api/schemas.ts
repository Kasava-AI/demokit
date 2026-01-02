import { z } from 'zod'
import { featureCategoryEnum, templateCategoryEnum } from '@intelligence'

// Project schemas
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  schema: z.record(z.string(), z.unknown()).optional(),
})

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  schema: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['pending', 'analyzing', 'ready', 'error']).optional(),
  activeFixtureId: z.string().uuid().nullable().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
})

// Intelligence schemas
export const appIdentitySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  domain: z.string().optional(),
  industry: z.string().optional(),
  targetAudience: z.string().optional(),
  valueProposition: z.string().optional(),
  competitiveAdvantages: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
})

export const featureSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: featureCategoryEnum.optional(),
  relatedModels: z.array(z.string()).optional(),
  relatedEndpoints: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
})

export const userJourneyStepSchema = z.object({
  order: z.number(),
  action: z.string(),
  description: z.string().optional(),
  endpoint: z.string().optional(),
  model: z.string().optional(),
})

export const userJourneySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  persona: z.string().optional(),
  steps: z.array(userJourneyStepSchema).optional(),
  relatedFeatures: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
})

// Template schemas
export const templateNarrativeSchema = z.object({
  scenario: z.string(),
  keyPoints: z.array(z.string()),
  tone: z.string().optional(),
  targetAudience: z.string().optional(),
})

export const templateInstructionsSchema = z.object({
  recordCounts: z.record(z.string(), z.number()).optional(),
  constraints: z.record(z.string(), z.unknown()).optional(),
  relationships: z.array(z.object({
    from: z.string(),
    to: z.string(),
    type: z.string(),
  })).optional(),
})

// Template schema for saving during intelligence (includes relevanceScore)
export const saveTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  category: templateCategoryEnum.optional(),
  narrative: templateNarrativeSchema.optional(),
  instructions: templateInstructionsSchema.optional(),
  preview: z.record(z.string(), z.unknown()).optional(),
  relevanceScore: z.number().min(0).max(1).optional(),
  isDefault: z.boolean().optional(),
})

export const saveIntelligenceSchema = z.object({
  appIdentity: appIdentitySchema.optional(),
  features: z.array(featureSchema).optional(),
  journeys: z.array(userJourneySchema).optional(),
  templates: z.array(saveTemplateSchema).optional(),
})

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  category: templateCategoryEnum.optional(),
  narrative: templateNarrativeSchema.optional(),
  instructions: templateInstructionsSchema.optional(),
  preview: z.record(z.string(), z.unknown()).optional(),
  isDefault: z.boolean().optional(),
})

// Fixture schemas
export const createFixtureSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  templateId: z.string().uuid().optional(),
})

export const updateFixtureSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  activeGenerationId: z.string().uuid().nullable().optional(),
})

// Generation schemas
export const generationLevelSchema = z.enum(['schema-valid', 'relationship-valid', 'narrative-driven'])

export const createGenerationSchema = z.object({
  label: z.string().max(100).optional(),
  level: generationLevelSchema,
  data: z.record(z.string(), z.array(z.unknown())),
  code: z.string().optional(),
  validationValid: z.boolean(),
  validationErrorCount: z.number().int().min(0).default(0),
  validationWarningCount: z.number().int().min(0).default(0),
  validationErrors: z.array(z.object({
    type: z.string(),
    model: z.string(),
    field: z.string().optional(),
    message: z.string(),
  })).optional(),
  recordCount: z.number().int().min(0).optional(),
  recordsByModel: z.record(z.string(), z.number()).optional(),
  inputParameters: z.record(z.string(), z.unknown()).optional(),
  durationMs: z.number().int().min(0).optional(),
  tokensUsed: z.number().int().min(0).optional(),
})

// Project source schemas
export const sourceTypeEnum = z.enum(['website', 'readme', 'documentation'])

export const createSourceSchema = z.object({
  type: sourceTypeEnum,
  url: z.string().url().optional().nullable(),
  content: z.string().optional().nullable(),
})

export const updateSourceSchema = z.object({
  url: z.string().url().optional().nullable(),
  content: z.string().optional().nullable(),
})

// Type exports
export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type CreateGenerationInput = z.infer<typeof createGenerationSchema>
export type SaveIntelligenceInput = z.infer<typeof saveIntelligenceSchema>
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>
export type CreateFixtureInput = z.infer<typeof createFixtureSchema>
export type UpdateFixtureInput = z.infer<typeof updateFixtureSchema>
export type CreateSourceInput = z.infer<typeof createSourceSchema>
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>

// Demo schemas
export const demoStepSchema = z.object({
  order: z.number(),
  action: z.string(),
  description: z.string().optional(),
  endpoint: z.string().optional(),
  model: z.string().optional(),
  featuresUsed: z.array(z.string()).optional(),
})

export const createDemoSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().optional(),

  // Composition inputs
  selectedFeatureIds: z.array(z.string().uuid()).optional(),
  baseJourneyId: z.string().uuid().optional().nullable(),
  customSteps: z.array(demoStepSchema).optional(),

  // Scenario context
  persona: z.string().optional(),
  goal: z.string().optional(),
  constraints: z.array(z.string()).optional(),
  storyNotes: z.string().optional(),

  // Organization
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
})

export const updateDemoSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional(),

  // Composition inputs
  selectedFeatureIds: z.array(z.string().uuid()).optional(),
  baseJourneyId: z.string().uuid().optional().nullable(),
  customSteps: z.array(demoStepSchema).optional(),

  // Scenario context
  persona: z.string().optional(),
  goal: z.string().optional(),
  constraints: z.array(z.string()).optional(),
  storyNotes: z.string().optional(),

  // AI-generated outputs
  narrative: z.string().optional(),

  // Organization
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),

  // State
  isPublished: z.boolean().optional(),
  defaultVariantId: z.string().uuid().optional().nullable(),
})

// Demo variant schemas
export const createDemoVariantSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
  generationParams: z.object({
    recordCounts: z.record(z.string(), z.number()).optional(),
    constraints: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
})

export const updateDemoVariantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  generationParams: z.object({
    recordCounts: z.record(z.string(), z.number()).optional(),
    constraints: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
})

// Demo set schemas
export const createDemoSetSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().optional(),
  demos: z.array(z.object({
    demoId: z.string().uuid(),
    variantSlug: z.string().optional(),
    loadOrder: z.number(),
  })).optional(),
  tags: z.array(z.string()).optional(),
})

export const updateDemoSetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional(),
  demos: z.array(z.object({
    demoId: z.string().uuid(),
    variantSlug: z.string().optional(),
    loadOrder: z.number(),
  })).optional(),
  tags: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
})

// Type exports for demos
export type CreateDemoInput = z.infer<typeof createDemoSchema>
export type UpdateDemoInput = z.infer<typeof updateDemoSchema>
export type CreateDemoVariantInput = z.infer<typeof createDemoVariantSchema>
export type UpdateDemoVariantInput = z.infer<typeof updateDemoVariantSchema>
export type CreateDemoSetInput = z.infer<typeof createDemoSetSchema>
export type UpdateDemoSetInput = z.infer<typeof updateDemoSetSchema>

// Endpoint Mapping schemas
export const httpMethodEnum = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
export const responseTypeEnum = z.enum(['collection', 'single', 'custom'])
export const mappingStatusEnum = z.enum(['valid', 'corrected', 'flagged', 'disabled'])

export const createEndpointMappingSchema = z.object({
  method: httpMethodEnum,
  pattern: z.string().min(1, 'Pattern is required'),
  sourceModel: z.string().min(1, 'Source model is required'),
  responseType: responseTypeEnum.default('collection'),
  lookupField: z.string().optional().nullable(),
  lookupParam: z.string().optional().nullable(),
  transformCode: z.string().optional().nullable(),
  isAutoGenerated: z.boolean().default(false),
  priority: z.number().int().default(0),
})

export const updateEndpointMappingSchema = z.object({
  method: httpMethodEnum.optional(),
  pattern: z.string().min(1).optional(),
  sourceModel: z.string().min(1).optional(),
  responseType: responseTypeEnum.optional(),
  lookupField: z.string().optional().nullable(),
  lookupParam: z.string().optional().nullable(),
  transformCode: z.string().optional().nullable(),
  isEnabled: z.boolean().optional(),
  priority: z.number().int().optional(),
})

export const bulkCreateEndpointMappingsSchema = z.object({
  mappings: z.array(createEndpointMappingSchema),
})

export type CreateEndpointMappingInput = z.infer<typeof createEndpointMappingSchema>
export type UpdateEndpointMappingInput = z.infer<typeof updateEndpointMappingSchema>
export type BulkCreateEndpointMappingsInput = z.infer<typeof bulkCreateEndpointMappingsSchema>
