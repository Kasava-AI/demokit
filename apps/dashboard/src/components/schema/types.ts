/**
 * Types for codebase schema extraction components.
 */

/**
 * Supported schema formats for auto-detection.
 */
export type SchemaFormat =
  | 'typescript'
  | 'zod'
  | 'drizzle'
  | 'prisma'
  | 'graphql'
  | 'supabase'
  | 'trpc'
  | 'nextjs'
  | 'openapi'
  | 'auto'

/**
 * GitHub repository information.
 */
export interface GitHubRepository {
  id: number
  name: string
  fullName: string
  owner: string
  description: string | null
  defaultBranch: string
  private: boolean
  updatedAt: string
  pushedAt: string | null
  language: string | null
  starCount: number
}

/**
 * GitHub branch information.
 */
export interface GitHubBranch {
  name: string
  protected: boolean
  commit: {
    sha: string
    url: string
  }
}

/**
 * Discovered schema file in a repository.
 */
export interface DiscoveredSchemaFile {
  path: string
  name: string
  format: SchemaFormat
  confidence: number
  size: number
  sha: string
}

/**
 * File content fetched from GitHub.
 */
export interface CodebaseFile {
  path: string
  content: string
  sha?: string
}

/**
 * Parsed schema model.
 */
export interface ParsedModel {
  name: string
  type: 'object' | 'string' | 'enum'
  description?: string
  propertyCount: number
  required: string[]
}

/**
 * Parsed relationship between models.
 */
export interface ParsedRelationship {
  from: { model: string; field: string }
  to: { model: string; field: string }
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many'
  required: boolean
}

/**
 * Full DemokitSchema structure
 */
export interface DemokitSchema {
  info: { title: string; version: string; description?: string; baseUrl?: string }
  endpoints: unknown[]
  models: Record<string, unknown>
  relationships: { from: { model: string }; to: { model: string }; type: string }[]
}

/**
 * Schema parsing result summary.
 */
export interface ParsedSchemaResult {
  /** The full parsed schema in DemokitSchema format */
  schema: DemokitSchema
  /** Summary list of parsed models */
  models: ParsedModel[]
  /** Summary list of parsed relationships */
  relationships: ParsedRelationship[]
  warnings: ParseWarning[]
  parsedFiles: string[]
  format: SchemaFormat
}

/**
 * Warning from schema parsing.
 */
export interface ParseWarning {
  code: string
  message: string
  file?: string
}

/**
 * Steps in the multi-step schema import flow.
 */
export type SchemaImportStep =
  | 'method'      // Choose GitHub or upload
  | 'repository'  // Select repository (GitHub only)
  | 'files'       // Select schema files
  | 'preview'     // Preview parsed schema
  | 'confirm'     // Confirm import

/**
 * State for the multi-step import flow.
 */
export interface SchemaImportState {
  step: SchemaImportStep
  method: 'github' | 'upload' | null
  repository: GitHubRepository | null
  branch: string | null
  selectedFiles: DiscoveredSchemaFile[]
  uploadedFiles: CodebaseFile[]
  parsedSchema: ParsedSchemaResult | null
  isLoading: boolean
  error: string | null
}

/**
 * GitHub connection status.
 */
export interface GitHubConnection {
  id: string
  githubUserId: string
  githubUsername: string
  avatarUrl?: string
  connectedAt: string
  scopes: string[]
}

/**
 * Props for the main schema source sheet.
 */
export interface GitHubSchemaSourceSheetProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete?: (result: ParsedSchemaResult) => void
}

/**
 * Props for individual step components.
 */
export interface StepProps {
  state: SchemaImportState
  onStateChange: (updates: Partial<SchemaImportState>) => void
  onNext: () => void
  onBack: () => void
}
