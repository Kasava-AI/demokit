import { pgEnum } from 'drizzle-orm/pg-core';

// Project status
export const projectStatus = pgEnum('project_status', [
  'pending', // Just created, no analysis yet
  'analyzing', // Intelligence synthesis in progress
  'ready', // Analysis complete, ready to generate
  'error', // Analysis failed
]);

// Template category - must match TEMPLATE_CATEGORIES in @intelligence types
export const templateCategory = pgEnum('template_category', [
  'demo', // Standard demo scenarios
  'happyPath', // Ideal user flows
  'edgeCase', // Edge cases and error handling
  'onboarding', // New user experience
  'migration', // Data migration scenarios
  'recovery', // Recovery from errors/failures
  'growth', // Growth/scaling scenarios
  'decline', // Decline/churn scenarios
  'comparison', // A/B comparison scenarios
  'training', // Training/learning scenarios
]);

// Fixture status
export const fixtureStatus = pgEnum('fixture_status', [
  'pending', // Queued for generation
  'generating', // Currently being generated
  'completed', // Successfully generated
  'failed', // Generation failed
]);

// Generation level - complexity/fidelity of generated data
export const generationLevel = pgEnum('generation_level', [
  'schema-valid', // L1: Only validates against schema types
  'relationship-valid', // L2: Validates relationships between entities
  'narrative-driven', // L3: AI-driven with narrative context
]);

// User role
export const userRole = pgEnum('user_role', ['owner', 'admin', 'member', 'viewer']);

// Organization member role
export const orgMemberRole = pgEnum('org_member_role', ['owner', 'admin', 'member', 'viewer']);

// Invitation status
export const invitationStatus = pgEnum('invitation_status', ['pending', 'accepted', 'expired', 'revoked']);

// Schema format - types of codebase schemas we can parse
export const schemaFormat = pgEnum('schema_format', [
  'typescript', // TypeScript interfaces/types
  'zod', // Zod validation schemas
  'drizzle', // Drizzle ORM schemas
  'prisma', // Prisma schema files
  'graphql', // GraphQL SDL
  'supabase', // Supabase generated types
  'trpc', // tRPC router definitions
  'nextjs', // Next.js API routes/Server Actions
  'openapi', // OpenAPI/Swagger specs
]);

// HTTP method for endpoint mappings
export const httpMethod = pgEnum('http_method', [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
]);

// Response type for endpoint mappings
export const endpointResponseType = pgEnum('endpoint_response_type', [
  'collection', // Returns array of records (query-param filter/sort/pagination)
  'single', // Returns single record (by ID lookup)
  'custom', // Legacy transform-code type — retired, kept for existing rows
  'create', // model.create(body) -> 201
  'update', // model.update(id, body)
  'delete', // model.delete(id) -> 204
  'aggregate', // computed projection (count/sum/avg/groupBy)
  'transform', // named reference into the app's transform registry
]);

// Mapping validation status (from Mastra agent)
export const mappingStatus = pgEnum('mapping_status', [
  'valid', // Mapping is correct as-is
  'corrected', // Mapping was auto-corrected by AI
  'flagged', // Uncertain, needs user review
  'disabled', // User disabled this mapping
]);

/** Coverage-health event types on api_call_logs (spec §8). */
export const apiCallEventType = pgEnum('api_call_event_type', [
  'fixture_fetch',
  'unmatched_request',
  'blocked_mutation',
  'unregistered_transform',
  'projection_error',
]);
