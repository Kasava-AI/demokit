import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  real,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { templateCategory } from './enums';

// Dynamic templates - AI-generated demo scenarios
export const templates = pgTable(
  'templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    description: text('description'),
    category: templateCategory('category').default('demo'),

    // Narrative structure
    narrative: jsonb('narrative').$type<{
      scenario: string;
      keyPoints: string[];
      tone?: string;
      targetAudience?: string;
    }>(),

    // Generation instructions
    instructions: jsonb('instructions').$type<{
      recordCounts?: Record<string, number>;
      constraints?: Record<string, unknown>;
      relationships?: Array<{
        from: string;
        to: string;
        type: string;
      }>;
    }>(),

    // Preview of what will be generated
    preview: jsonb('preview').$type<Record<string, unknown>>(),

    // Relevance score for sorting
    relevanceScore: real('relevance_score'),

    // Metadata
    isDefault: boolean('is_default').default(false), // System-generated vs user-created
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    projectIdIdx: index('idx_templates_project_id').on(table.projectId),
    categoryIdx: index('idx_templates_category').on(table.category),
    relevanceIdx: index('idx_templates_relevance').on(table.relevanceScore),
  })
);
