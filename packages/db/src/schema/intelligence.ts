import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  real,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { projects, projectSources } from './projects';

// App identity - extracted app information
export const appIdentity = pgTable(
  'app_identity',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' })
      .unique(),

    // Core identity
    name: text('name'),
    description: text('description'),
    domain: text('domain'), // e.g., 'e-commerce', 'healthcare', 'fintech'
    industry: text('industry'),
    targetAudience: text('target_audience'),

    // Business context
    valueProposition: text('value_proposition'),
    competitiveAdvantages: jsonb('competitive_advantages').$type<string[]>(),

    // Confidence
    confidence: real('confidence'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    projectIdIdx: index('idx_app_identity_project_id').on(table.projectId),
  })
);

// Features - detected application features
export const features = pgTable(
  'features',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    description: text('description'),
    category: text('category'), // See FEATURE_CATEGORIES in @intelligence types

    // Related schema elements
    relatedModels: jsonb('related_models').$type<string[]>(),
    relatedEndpoints: jsonb('related_endpoints').$type<string[]>(),

    // Confidence and metadata
    confidence: real('confidence'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    projectIdIdx: index('idx_features_project_id').on(table.projectId),
    categoryIdx: index('idx_features_category').on(table.category),
  })
);

// User journeys - common paths through the application
export const userJourneys = pgTable(
  'user_journeys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    description: text('description'),
    persona: text('persona'), // e.g., 'new_user', 'power_user', 'admin'

    // Journey steps as structured data
    steps: jsonb('steps').$type<
      Array<{
        order: number;
        action: string;
        description: string;
        endpoint?: string;
        model?: string;
      }>
    >(),

    // Related features
    relatedFeatures: jsonb('related_features').$type<string[]>(),

    // Confidence
    confidence: real('confidence'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    projectIdIdx: index('idx_user_journeys_project_id').on(table.projectId),
    personaIdx: index('idx_user_journeys_persona').on(table.persona),
  })
);

// Entity maps - business meaning for each model
export const entityMaps = pgTable(
  'entity_maps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),

    // Schema model reference
    modelName: text('model_name').notNull(),

    // Business context
    displayName: text('display_name'),
    purpose: text('purpose'),
    businessRelationships: jsonb('business_relationships').$type<
      Array<{
        relatedModel: string;
        relationshipType: string;
        description: string;
      }>
    >(),

    // Field annotations
    importantFields: jsonb('important_fields').$type<string[]>(),
    genericFields: jsonb('generic_fields').$type<string[]>(),

    // Confidence
    confidence: real('confidence'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    projectIdIdx: index('idx_entity_maps_project_id').on(table.projectId),
    modelNameIdx: index('idx_entity_maps_model_name').on(table.modelName),
  })
);

// Source contributions - links sources to features/journeys they contributed to
export const sourceContributions = pgTable(
  'source_contributions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => projectSources.id, { onDelete: 'cascade' }),

    // Entity reference (feature or journey)
    entityType: text('entity_type').notNull(), // 'feature' | 'journey'
    entityId: uuid('entity_id').notNull(),

    // Evidence and confidence
    evidence: text('evidence'), // Text snippet showing how this source contributed
    confidence: real('confidence'), // 0-1 confidence score

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    sourceIdIdx: index('idx_source_contributions_source_id').on(table.sourceId),
    entityIdx: index('idx_source_contributions_entity').on(table.entityType, table.entityId),
    uniqueContribution: unique('unique_source_entity').on(table.sourceId, table.entityType, table.entityId),
  })
);
