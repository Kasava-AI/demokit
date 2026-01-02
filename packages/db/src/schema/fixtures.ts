import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  integer,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { templates } from './templates';
import {
  fixtureStatus,
  generationLevel,
  httpMethod,
  endpointResponseType,
  mappingStatus,
} from './enums';

// Forward declaration for circular reference
// activeGenerationId references fixtureGenerations, which references fixtures
// We handle this by not using .references() for activeGenerationId

// Fixtures - named containers for generated demo data sets
// The actual data lives in fixtureGenerations; fixtures point to an "active" generation
export const fixtures = pgTable(
  'fixtures',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    templateId: uuid('template_id').references(() => templates.id, {
      onDelete: 'set null',
    }),
    // In OSS single-user mode, we keep the column but don't enforce FK
    createdById: uuid('created_by_id'),

    // Demo system references (new)
    // Note: Can't use .references() due to circular dependency - enforced at app level
    demoId: uuid('demo_id'),
    variantId: uuid('variant_id'),

    name: text('name').notNull(),
    slug: text('slug'), // For SDK access: demo.load('fixture-slug')
    description: text('description'),

    // Points to the currently active generation (the "current version")
    // Note: Can't use .references() due to circular dependency - enforced at app level
    activeGenerationId: uuid('active_generation_id'),

    // Export metadata
    lastExportedAt: timestamp('last_exported_at', { withTimezone: true }),
    exportFormat: text('export_format'), // 'json' | 'typescript' | 'sql'

    // Hosted API fields
    apiKey: text('api_key').unique(), // dk_live_xxxx format
    hostedEnabled: boolean('hosted_enabled').default(false),

    // Organization
    tags: jsonb('tags').$type<string[]>().default([]),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    projectIdIdx: index('idx_fixtures_project_id').on(table.projectId),
    templateIdIdx: index('idx_fixtures_template_id').on(table.templateId),
    activeGenerationIdIdx: index('idx_fixtures_active_generation_id').on(table.activeGenerationId),
    apiKeyIdx: index('idx_fixtures_api_key').on(table.apiKey),
    demoIdIdx: index('idx_fixtures_demo_id').on(table.demoId),
    variantIdIdx: index('idx_fixtures_variant_id').on(table.variantId),
    slugIdx: index('idx_fixtures_slug').on(table.projectId, table.slug),
  })
);

// Fixture generations - history of generation attempts
// Each generation contains the actual generated data
export const fixtureGenerations = pgTable(
  'fixture_generations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fixtureId: uuid('fixture_id')
      .notNull()
      .references(() => fixtures.id, { onDelete: 'cascade' }),

    // User-friendly label for this generation
    label: text('label'),

    // Generation level used (L1/L2/L3)
    level: generationLevel('level').notNull().default('relationship-valid'),

    // The actual generated data (moved from fixtures table)
    data: jsonb('data').$type<Record<string, unknown[]>>(),

    // Generated TypeScript/code output
    code: text('code'),

    // Validation results
    validationValid: boolean('validation_valid'),
    validationErrorCount: integer('validation_error_count').default(0),
    validationWarningCount: integer('validation_warning_count').default(0),
    validationErrors: jsonb('validation_errors').$type<
      Array<{
        type: string;
        model: string;
        field?: string;
        message: string;
      }>
    >(),

    // Record counts
    recordCount: integer('record_count'),
    recordsByModel: jsonb('records_by_model').$type<Record<string, number>>(),

    // Input parameters used for this generation
    inputParameters: jsonb('input_parameters').$type<Record<string, unknown>>(),

    // Generation status
    status: fixtureStatus('status').default('completed'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    // Error tracking (for failed generations)
    errorMessage: text('error_message'),
    errorDetails: jsonb('error_details').$type<Record<string, unknown>>(),

    // Performance metrics
    durationMs: integer('duration_ms'),
    tokensUsed: integer('tokens_used'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    fixtureIdIdx: index('idx_fixture_generations_fixture_id').on(table.fixtureId),
    statusIdx: index('idx_fixture_generations_status').on(table.status),
    createdAtIdx: index('idx_fixture_generations_created_at').on(table.createdAt),
  })
);

// API Call Logs - tracks calls to the hosted fixture API
// Retained for 7 days, then auto-deleted
export const apiCallLogs = pgTable(
  'api_call_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fixtureId: uuid('fixture_id')
      .notNull()
      .references(() => fixtures.id, { onDelete: 'cascade' }),

    // Request metadata
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),

    // Response metadata
    responseTimeMs: integer('response_time_ms'),
    statusCode: integer('status_code'),
    errorMessage: text('error_message'),
  },
  (table) => ({
    fixtureIdIdx: index('idx_api_call_logs_fixture_id').on(table.fixtureId),
    timestampIdx: index('idx_api_call_logs_timestamp').on(table.timestamp),
  })
);

// Endpoint Mappings - maps API endpoints to fixture data models
// Auto-inferred from schema + validated/corrected by Mastra AI agent
export const endpointMappings = pgTable(
  'endpoint_mappings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fixtureId: uuid('fixture_id')
      .notNull()
      .references(() => fixtures.id, { onDelete: 'cascade' }),

    // Endpoint pattern (e.g., "/api/users/:id")
    method: httpMethod('method').notNull(),
    pattern: text('pattern').notNull(), // URL pattern with :param placeholders

    // Data source - which model in fixture data to use
    sourceModel: text('source_model').notNull(), // Key in fixtureGenerations.data

    // Response configuration
    responseType: endpointResponseType('response_type').notNull().default('collection'),

    // For 'single' response type - how to find the record
    lookupField: text('lookup_field'), // Field in data to match against (e.g., "id")
    lookupParam: text('lookup_param'), // URL param name to use for lookup (e.g., "id", "userId")

    // For 'custom' response type - transformation code
    transformCode: text('transform_code'), // JavaScript function body

    // Validation metadata (from Mastra agent)
    status: mappingStatus('status').notNull().default('valid'),
    originalSourceModel: text('original_source_model'), // If corrected, what was the original
    validationReason: text('validation_reason'), // Why this status was assigned
    confidence: integer('confidence'), // 0-100 confidence score from AI

    // Flags
    isAutoGenerated: boolean('is_auto_generated').notNull().default(true),
    isEnabled: boolean('is_enabled').notNull().default(true),

    // Ordering for pattern matching (more specific patterns first)
    priority: integer('priority').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    fixtureIdIdx: index('idx_endpoint_mappings_fixture_id').on(table.fixtureId),
    patternIdx: index('idx_endpoint_mappings_pattern').on(table.method, table.pattern),
    enabledIdx: index('idx_endpoint_mappings_enabled').on(table.fixtureId, table.isEnabled),
  })
);
