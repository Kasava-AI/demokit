import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  boolean,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { userJourneys } from './intelligence';

/**
 * Demos - Semantic containers for demo stories
 *
 * A demo represents a composable story that users can create by combining:
 * - Selected features to highlight
 * - A base journey (with optional customizations)
 * - Scenario context (persona, goal, constraints)
 *
 * Demos can have multiple variants (editions) for different contexts.
 */
export const demos = pgTable(
  'demos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),

    // Identity
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),

    // Composition inputs
    selectedFeatureIds: jsonb('selected_feature_ids').$type<string[]>(),
    baseJourneyId: uuid('base_journey_id').references(() => userJourneys.id, {
      onDelete: 'set null',
    }),
    customSteps: jsonb('custom_steps').$type<
      Array<{
        order: number;
        action: string;
        description?: string;
        endpoint?: string;
        model?: string;
        featuresUsed?: string[];
      }>
    >(),

    // Scenario context
    persona: text('persona'),
    goal: text('goal'),
    constraints: jsonb('constraints').$type<string[]>(),
    storyNotes: text('story_notes'),

    // AI-generated outputs
    narrative: text('narrative'),

    // Organization
    tags: jsonb('tags').$type<string[]>().default([]),
    category: text('category'),

    // State
    isPublished: boolean('is_published').default(false),
    defaultVariantId: uuid('default_variant_id'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    projectIdIdx: index('idx_demos_project_id').on(table.projectId),
    slugIdx: index('idx_demos_slug').on(table.projectId, table.slug),
    tagsIdx: index('idx_demos_tags').using('gin', table.tags),
    uniqueSlug: unique('unique_demo_slug').on(table.projectId, table.slug),
  })
);

/**
 * Demo Variants - Editions of a demo
 *
 * A variant represents a specific edition of a demo, such as:
 * - "Standard" - default everyday version
 * - "Holiday Edition" - seasonal theming
 * - "Enterprise" - B2B scale data
 *
 * Each variant can have its own generation parameters and fixtures.
 */
export const demoVariants = pgTable(
  'demo_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    demoId: uuid('demo_id')
      .notNull()
      .references(() => demos.id, { onDelete: 'cascade' }),

    // Identity
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),

    // State
    isDefault: boolean('is_default').default(false),
    isPublished: boolean('is_published').default(false),

    // Generation context
    generationParams: jsonb('generation_params').$type<{
      recordCounts?: Record<string, number>;
      constraints?: Record<string, unknown>;
    }>(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    demoIdIdx: index('idx_demo_variants_demo_id').on(table.demoId),
    slugIdx: index('idx_demo_variants_slug').on(table.demoId, table.slug),
    uniqueSlug: unique('unique_variant_slug').on(table.demoId, table.slug),
  })
);

/**
 * Demo Sets - Bundles of demos for comprehensive demonstrations
 *
 * A demo set allows users to load multiple demos together, useful for:
 * - Full product demos (all key journeys)
 * - Sales presentations (curated selection)
 * - Training scenarios (progressive complexity)
 */
export const demoSets = pgTable(
  'demo_sets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),

    // Identity
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),

    // Contents
    demos: jsonb('demos')
      .$type<
        Array<{
          demoId: string;
          variantSlug?: string;
          loadOrder: number;
        }>
      >()
      .default([]),

    // Organization
    tags: jsonb('tags').$type<string[]>().default([]),

    // State
    isPublished: boolean('is_published').default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    projectIdIdx: index('idx_demo_sets_project_id').on(table.projectId),
    slugIdx: index('idx_demo_sets_slug').on(table.projectId, table.slug),
    uniqueSlug: unique('unique_demo_set_slug').on(table.projectId, table.slug),
  })
);
