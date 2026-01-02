import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
  real,
  index,
} from 'drizzle-orm/pg-core';
import { projectStatus, schemaFormat } from './enums';

/**
 * Default organization ID for OSS single-user mode.
 * In OSS, all projects belong to this implicit organization.
 */
export const LOCAL_ORG_ID = '00000000-0000-0000-0000-000000000001';

// Projects table - main organizational unit
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // In OSS mode, this is always LOCAL_ORG_ID
    // In Cloud mode, this references the organizations table
    organizationId: uuid('organization_id').notNull().default(LOCAL_ORG_ID),
    name: text('name').notNull(),
    description: text('description'),
    status: projectStatus('status').default('pending'),

    // OpenAPI schema (stored as JSON)
    schema: jsonb('schema').$type<Record<string, unknown>>(),
    schemaVersion: text('schema_version'),

    // Confidence score from AI analysis (0-1)
    confidenceScore: real('confidence_score'),

    // Active fixture ID - the default fixture used for API calls in demo mode
    // Note: Can't use .references() due to circular dependency - enforced at app level
    activeFixtureId: uuid('active_fixture_id'),

    // SDK API key for project-level access (dk_live_proj_xxxx format)
    // Used by @demokit/sdk for semantic demo selection
    sdkApiKey: text('sdk_api_key').unique(),

    // Metadata
    settings: jsonb('settings').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    analyzedAt: timestamp('analyzed_at', { withTimezone: true }),
  },
  (table) => ({
    organizationIdIdx: index('idx_projects_organization_id').on(table.organizationId),
    statusIdx: index('idx_projects_status').on(table.status),
    activeFixtureIdIdx: index('idx_projects_active_fixture_id').on(table.activeFixtureId),
    sdkApiKeyIdx: index('idx_projects_sdk_api_key').on(table.sdkApiKey),
  })
);

// Project sources - website URLs, help center, README, codebase schemas
export const projectSources = pgTable(
  'project_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'website' | 'readme' | 'documentation' | 'codebase_schema'
    url: text('url'), // URL for website/documentation
    content: text('content'), // Raw content for readme/documentation

    // Scraping metadata
    lastFetchedAt: timestamp('last_fetched_at', { withTimezone: true }),
    fetchStatus: text('fetch_status'), // 'pending' | 'fetching' | 'completed' | 'failed'
    fetchError: text('fetch_error'),

    // Extracted content (after scraping)
    extractedContent: jsonb('extracted_content').$type<Record<string, unknown>>(),

    // GitHub repository integration (for codebase_schema type)
    githubRepo: text('github_repo'), // Format: 'owner/repo'
    githubBranch: text('github_branch').default('main'),
    githubPaths: text('github_paths').array(), // Array of file paths to parse
    githubCommitSha: text('github_commit_sha'), // Last synced commit SHA

    // Schema format for codebase sources (detected or user-selected)
    sourceSchemaFormat: schemaFormat('source_schema_format'),

    // Parsed schema result (DemokitSchema JSON)
    parsedSchema: jsonb('parsed_schema').$type<Record<string, unknown>>(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    projectIdIdx: index('idx_project_sources_project_id').on(table.projectId),
    typeIdx: index('idx_project_sources_type').on(table.type),
    githubRepoIdx: index('idx_project_sources_github_repo').on(table.githubRepo),
  })
);
