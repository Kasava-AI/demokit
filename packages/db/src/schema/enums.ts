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
export const orgMemberRole = pgEnum('org_member_role', ['owner', 'admin', 'member']);

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
  'collection', // Returns array of records
  'single', // Returns single record (by ID lookup)
  'custom', // Custom transformation function
]);

// Mapping validation status (from Mastra agent)
export const mappingStatus = pgEnum('mapping_status', [
  'valid', // Mapping is correct as-is
  'corrected', // Mapping was auto-corrected by AI
  'flagged', // Uncertain, needs user review
  'disabled', // User disabled this mapping
]);
