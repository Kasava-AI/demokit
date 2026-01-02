/**
 * App Context Inference
 *
 * Analyzes a DemokitSchema to infer what the application does,
 * its domain, key entities, and features. This provides context
 * for narrative-driven data generation.
 *
 * The inference process works in several stages:
 * 1. Domain detection - What type of application is this?
 * 2. Entity analysis - What are the key data objects?
 * 3. Feature inference - What can users do with the app?
 * 4. Business rule extraction - What constraints apply?
 *
 * @example
 * ```typescript
 * const schema = await importFromOpenAPI('api.yaml')
 * const context = inferAppContext(schema)
 * // context.domain === 'e-commerce'
 * // context.keyEntities includes Product, Order, Customer
 * ```
 */

import type { DemokitSchema, DataModel } from '../../schema'
import type { AppContext, EntityContext } from '../types'

// ============================================================================
// Domain Detection Keywords
// ============================================================================

/** Keywords that indicate an e-commerce application */
const ECOMMERCE_MODEL_KEYWORDS = ['product', 'cart', 'order', 'checkout', 'inventory', 'catalog']
const ECOMMERCE_FIELD_KEYWORDS = ['price', 'sku', 'quantity', 'cart', 'checkout']

/** Keywords that indicate a B2B SaaS application */
const B2B_SAAS_MODEL_KEYWORDS = ['subscription', 'plan', 'tenant', 'organization', 'workspace']
const B2B_SAAS_FIELD_KEYWORDS = ['mrr', 'arr', 'churn', 'subscription', 'plan']

/** Keywords that indicate a project management application */
const PROJECT_MGMT_KEYWORDS = ['project', 'task', 'sprint', 'milestone', 'issue', 'board']

/** Keywords that indicate a CRM application */
const CRM_KEYWORDS = ['lead', 'opportunity', 'contact', 'deal', 'pipeline']

/** Keywords that indicate a healthcare application */
const HEALTHCARE_KEYWORDS = ['patient', 'appointment', 'prescription', 'diagnosis', 'medical']

/** Keywords that indicate an education application */
const EDUCATION_KEYWORDS = ['course', 'student', 'lesson', 'enrollment', 'grade']

/** Keywords that indicate a social/community application */
const SOCIAL_KEYWORDS = ['post', 'comment', 'follow', 'like', 'feed', 'profile']

/** Keywords that indicate a content management application */
const CMS_KEYWORDS = ['article', 'page', 'content', 'media', 'template']

/** Keywords that indicate a finance application */
const FINANCE_KEYWORDS = ['transaction', 'account', 'payment', 'invoice', 'ledger']

// ============================================================================
// Main Inference Function
// ============================================================================

/**
 * Infer application context from a schema.
 *
 * This is the main entry point for context inference. It analyzes the schema
 * structure to understand what the application does and how its data relates.
 *
 * @param schema - The parsed DemokitSchema from an OpenAPI spec
 * @returns AppContext with inferred domain, entities, and features
 *
 * @example
 * ```typescript
 * const context = inferAppContext(schema)
 * console.log(context.domain) // 'e-commerce'
 * console.log(context.keyEntities.length) // 5
 * ```
 */
export function inferAppContext(schema: DemokitSchema): AppContext {
  const modelNames = Object.keys(schema.models)

  // Step 1: Detect the application domain (e-commerce, saas, etc.)
  const domain = inferDomain(modelNames, schema)

  // Step 2: Analyze each model to understand its purpose
  const keyEntities = modelNames
    .filter(name => schema.models[name]?.type === 'object')
    .map(name => inferEntityContext(name, schema.models[name]!, schema))

  // Step 3: Build the complete context
  return {
    name: schema.info.title || 'Application',
    description: schema.info.description || inferDescription(domain, keyEntities),
    domain,
    keyEntities,
    features: inferFeatures(schema),
  }
}

// ============================================================================
// Domain Detection
// ============================================================================

/**
 * Infer the application domain from model names and field names.
 *
 * Uses keyword matching to identify common application types. The order
 * of checks matters - more specific domains are checked first.
 *
 * @param modelNames - List of model names from the schema
 * @param schema - The full schema for accessing field names
 * @returns Domain string like 'e-commerce', 'b2b-saas', etc.
 */
function inferDomain(modelNames: string[], schema: DemokitSchema): string {
  const lowerNames = modelNames.map(n => n.toLowerCase())
  const allFields = getAllFieldNames(schema)

  // Check domain indicators in order of specificity

  // E-commerce: products, orders, shopping carts
  if (hasAny(lowerNames, ECOMMERCE_MODEL_KEYWORDS)) {
    return 'e-commerce'
  }
  if (hasAny(allFields, ECOMMERCE_FIELD_KEYWORDS)) {
    return 'e-commerce'
  }

  // B2B SaaS: subscriptions, tenants, workspaces
  if (hasAny(lowerNames, B2B_SAAS_MODEL_KEYWORDS)) {
    return 'b2b-saas'
  }
  if (hasAny(allFields, B2B_SAAS_FIELD_KEYWORDS)) {
    return 'b2b-saas'
  }

  // Project management: tasks, sprints, milestones
  if (hasAny(lowerNames, PROJECT_MGMT_KEYWORDS)) {
    return 'project-management'
  }

  // CRM: leads, opportunities, deals
  if (hasAny(lowerNames, CRM_KEYWORDS)) {
    return 'crm'
  }

  // Healthcare: patients, appointments, prescriptions
  if (hasAny(lowerNames, HEALTHCARE_KEYWORDS)) {
    return 'healthcare'
  }

  // Education: courses, students, enrollments
  if (hasAny(lowerNames, EDUCATION_KEYWORDS)) {
    return 'education'
  }

  // Social: posts, comments, follows
  if (hasAny(lowerNames, SOCIAL_KEYWORDS)) {
    return 'social'
  }

  // Content management: articles, pages, media
  if (hasAny(lowerNames, CMS_KEYWORDS)) {
    return 'content-management'
  }

  // Finance: transactions, accounts, payments
  if (hasAny(lowerNames, FINANCE_KEYWORDS)) {
    return 'finance'
  }

  // No specific domain detected
  return 'general'
}

/**
 * Collect all field names from all models in the schema.
 *
 * Used for domain detection based on field-level keywords (e.g., 'price'
 * suggests e-commerce even if models aren't named obviously).
 *
 * @param schema - The schema to extract field names from
 * @returns Array of lowercase field names
 */
function getAllFieldNames(schema: DemokitSchema): string[] {
  const fields: string[] = []
  for (const model of Object.values(schema.models)) {
    if (model.properties) {
      fields.push(...Object.keys(model.properties).map(f => f.toLowerCase()))
    }
  }
  return fields
}

/**
 * Check if any needle substring appears in any haystack string.
 *
 * Uses partial matching (includes) rather than exact matching to catch
 * variations like 'ProductCategory' containing 'product'.
 *
 * @param haystack - Array of strings to search in
 * @param needles - Array of substrings to search for
 * @returns true if any needle is found in any haystack item
 */
function hasAny(haystack: string[], needles: string[]): boolean {
  return needles.some(needle =>
    haystack.some(h => h.includes(needle))
  )
}

// ============================================================================
// Entity Context Inference
// ============================================================================

/**
 * Infer context for a single entity/model.
 *
 * Analyzes the model's properties, relationships, and naming to understand
 * what role it plays in the application.
 *
 * @param name - The model name
 * @param model - The model definition
 * @param schema - Full schema for relationship analysis
 * @returns EntityContext describing this entity's role
 */
function inferEntityContext(
  name: string,
  model: DataModel,
  schema: DemokitSchema
): EntityContext {
  const properties = model.properties || {}
  const propertyNames = Object.keys(properties)

  // Identify which fields are most important for this entity
  const keyFields = propertyNames.filter(fieldName => {
    const prop = properties[fieldName]
    const lowerName = fieldName.toLowerCase()

    // ID fields are always key - they identify the record
    if (lowerName === 'id' || lowerName.endsWith('id')) return true

    // Status fields are key - they track entity lifecycle
    if (lowerName === 'status' || lowerName === 'state') return true

    // Monetary fields are key - they drive business value
    if (lowerName.includes('amount') || lowerName.includes('total') || lowerName.includes('price')) return true

    // Enum fields are often important - they categorize records
    if (prop?.enum && prop.enum.length > 0) return true

    return false
  })

  // Infer what this entity represents
  const purpose = inferEntityPurpose(name, model, schema)

  // Extract any business rules that apply
  const businessRules = inferBusinessRules(name, model, schema)

  return {
    name,
    purpose,
    keyFields: keyFields.slice(0, 5), // Limit to top 5 for readability
    businessRules: businessRules.length > 0 ? businessRules : undefined,
  }
}

/**
 * Infer the purpose/role of an entity based on its name and structure.
 *
 * Uses a combination of:
 * 1. Common naming patterns (User, Order, Product, etc.)
 * 2. Relationship analysis (what references this entity?)
 * 3. Field patterns (does it have status, timestamps, etc.?)
 *
 * @param name - The entity name
 * @param model - The model definition
 * @param schema - Full schema for relationship lookup
 * @returns Human-readable description of the entity's purpose
 */
function inferEntityPurpose(name: string, model: DataModel, schema: DemokitSchema): string {
  const lowerName = name.toLowerCase()
  const properties = model.properties || {}
  const propNames = Object.keys(properties).map(p => p.toLowerCase())

  // Check for common entity types with well-known purposes
  // These are ordered by specificity/likelihood

  if (lowerName === 'user' || lowerName === 'users') {
    return 'Represents a user account in the system'
  }
  if (lowerName === 'customer' || lowerName === 'customers') {
    return 'Represents a customer who purchases products or services'
  }
  if (lowerName === 'order' || lowerName === 'orders') {
    return 'Represents a purchase order placed by a customer'
  }
  if (lowerName === 'product' || lowerName === 'products') {
    return 'Represents a product available for purchase'
  }
  if (lowerName === 'project' || lowerName === 'projects') {
    return 'Represents a project containing tasks and milestones'
  }
  if (lowerName === 'task' || lowerName === 'tasks') {
    return 'Represents a task or work item to be completed'
  }
  if (lowerName === 'subscription' || lowerName === 'subscriptions') {
    return 'Represents a recurring subscription to a plan'
  }
  if (lowerName === 'invoice' || lowerName === 'invoices') {
    return 'Represents a billing invoice for payment'
  }
  if (lowerName === 'payment' || lowerName === 'payments') {
    return 'Represents a payment transaction'
  }
  if (lowerName === 'comment' || lowerName === 'comments') {
    return 'Represents a comment or reply on content'
  }
  if (lowerName === 'post' || lowerName === 'posts') {
    return 'Represents a post or content item'
  }

  // Analyze relationships to understand the entity's role
  const incomingRels = schema.relationships.filter(r => r.to.model === name)
  const outgoingRels = schema.relationships.filter(r => r.from.model === name)

  // If many things reference this entity, it's a core entity
  if (incomingRels.length > outgoingRels.length) {
    return `Core entity referenced by ${incomingRels.map(r => r.from.model).join(', ')}`
  }

  // If this entity references many things, it's a junction/connector
  if (outgoingRels.length > 0) {
    return `Entity that connects to ${outgoingRels.map(r => r.to.model).join(', ')}`
  }

  // Fall back to field-based inference
  if (propNames.includes('status') || propNames.includes('state')) {
    return `Entity with tracked lifecycle status`
  }

  if (propNames.includes('createdat') || propNames.includes('created_at')) {
    return `Time-tracked entity for ${name.toLowerCase()} records`
  }

  // Generic fallback
  return `Represents ${name.toLowerCase()} data in the system`
}

/**
 * Infer business rules from schema constraints and relationships.
 *
 * Extracts rules from:
 * 1. Required fields (what must be provided)
 * 2. Enum constraints (what values are allowed)
 * 3. Relationships (what must exist first)
 * 4. Timestamp pairs (ordering constraints)
 *
 * @param name - The entity name
 * @param model - The model definition
 * @param schema - Full schema for relationship lookup
 * @returns Array of human-readable business rules
 */
function inferBusinessRules(name: string, model: DataModel, schema: DemokitSchema): string[] {
  const rules: string[] = []
  const properties = model.properties || {}
  const required = model.required || []

  // Rule: Required fields must be provided
  if (required.length > 0) {
    const requiredList = required.slice(0, 3).join(', ')
    const ellipsis = required.length > 3 ? '...' : ''
    rules.push(`Must have: ${requiredList}${ellipsis}`)
  }

  // Rule: Status/state fields have allowed values
  for (const [fieldName, prop] of Object.entries(properties)) {
    const isStatusField = fieldName.toLowerCase() === 'status' || fieldName.toLowerCase() === 'state'
    if (isStatusField && prop.enum) {
      rules.push(`Status can be: ${prop.enum.join(', ')}`)
    }
  }

  // Rule: Required relationships (foreign keys that must exist)
  const outgoingRels = schema.relationships.filter(r => r.from.model === name && r.required)
  for (const rel of outgoingRels) {
    rules.push(`Must belong to a ${rel.to.model}`)
  }

  // Rule: Timestamp ordering (createdAt <= updatedAt)
  const hasCreatedAt = Object.keys(properties).some(p =>
    p.toLowerCase().includes('createdat') || p.toLowerCase().includes('created_at')
  )
  const hasUpdatedAt = Object.keys(properties).some(p =>
    p.toLowerCase().includes('updatedat') || p.toLowerCase().includes('updated_at')
  )
  if (hasCreatedAt && hasUpdatedAt) {
    rules.push('UpdatedAt must be >= CreatedAt')
  }

  return rules
}

// ============================================================================
// Description and Feature Inference
// ============================================================================

/**
 * Generate a description from the inferred domain and entities.
 *
 * Creates a human-readable description when the schema doesn't provide one.
 *
 * @param domain - The detected application domain
 * @param entities - The inferred entity contexts
 * @returns Generated description string
 */
function inferDescription(domain: string, entities: EntityContext[]): string {
  // List the first few entity names for context
  const entityList = entities.slice(0, 3).map(e => e.name).join(', ')

  // Map domains to description templates
  const domainDescriptions: Record<string, string> = {
    'e-commerce': `E-commerce platform managing ${entityList}`,
    'b2b-saas': `B2B SaaS application with ${entityList}`,
    'project-management': `Project management tool for tracking ${entityList}`,
    'crm': `Customer relationship management system with ${entityList}`,
    'healthcare': `Healthcare application managing ${entityList}`,
    'education': `Educational platform with ${entityList}`,
    'social': `Social platform featuring ${entityList}`,
    'content-management': `Content management system for ${entityList}`,
    'finance': `Financial application handling ${entityList}`,
    'general': `Application managing ${entityList}`,
  }

  return domainDescriptions[domain] ?? domainDescriptions['general'] ?? `Application managing ${entityList}`
}

/**
 * Infer application features from endpoints and model names.
 *
 * Analyzes:
 * 1. HTTP methods to detect CRUD capabilities
 * 2. Path patterns to detect search functionality
 * 3. Model names to detect common feature modules
 *
 * @param schema - The schema to analyze
 * @returns Array of feature descriptions
 */
function inferFeatures(schema: DemokitSchema): string[] {
  const features: string[] = []
  const endpoints = schema.endpoints || []
  const modelNames = Object.keys(schema.models)

  // Detect CRUD capabilities from HTTP methods
  const hasCreate = endpoints.some(e => e.method === 'POST')
  const hasUpdate = endpoints.some(e => e.method === 'PUT' || e.method === 'PATCH')
  const hasDelete = endpoints.some(e => e.method === 'DELETE')
  const hasSearch = endpoints.some(e =>
    e.path.includes('search') || e.path.includes('query')
  )

  if (hasCreate) features.push('Create records')
  if (hasUpdate) features.push('Update records')
  if (hasDelete) features.push('Delete records')
  if (hasSearch) features.push('Search functionality')

  // Detect common feature modules from model names
  if (modelNames.some(n => n.toLowerCase().includes('user'))) {
    features.push('User management')
  }
  if (modelNames.some(n => n.toLowerCase().includes('auth') || n.toLowerCase().includes('session'))) {
    features.push('Authentication')
  }
  if (modelNames.some(n => n.toLowerCase().includes('notification'))) {
    features.push('Notifications')
  }
  if (modelNames.some(n => n.toLowerCase().includes('report') || n.toLowerCase().includes('analytics'))) {
    features.push('Reporting & analytics')
  }

  // Default feature if nothing detected
  return features.length > 0 ? features : ['Data management']
}

// ============================================================================
// Public Helper Functions
// ============================================================================

/**
 * Create a custom app context with explicit values.
 *
 * Use this when the user wants to provide their own context rather than
 * relying on inference. Useful for demos where the inferred context
 * doesn't match the intended story.
 *
 * @param name - Application name
 * @param description - What the app does
 * @param domain - Application domain
 * @param entities - Key entities with their purposes
 * @param features - Main features/capabilities
 * @returns Complete AppContext object
 *
 * @example
 * ```typescript
 * const context = createAppContext(
 *   'ShopFlow',
 *   'Enterprise e-commerce platform',
 *   'e-commerce',
 *   [{ name: 'Product', purpose: 'Items for sale', keyFields: ['id', 'price'] }],
 *   ['Checkout', 'Inventory Management']
 * )
 * ```
 */
export function createAppContext(
  name: string,
  description: string,
  domain: string,
  entities: EntityContext[],
  features: string[]
): AppContext {
  return {
    name,
    description,
    domain,
    keyEntities: entities,
    features,
  }
}

/**
 * Merge inferred context with user-provided overrides.
 *
 * Allows users to customize specific parts of the inferred context
 * while keeping the rest. Useful for fine-tuning without starting
 * from scratch.
 *
 * @param inferred - The automatically inferred context
 * @param overrides - User-provided values to override
 * @returns Merged context with overrides taking precedence
 *
 * @example
 * ```typescript
 * const inferred = inferAppContext(schema)
 * const custom = mergeAppContext(inferred, {
 *   name: 'My Custom App Name',
 *   domain: 'b2b-saas', // Override the detected domain
 * })
 * ```
 */
export function mergeAppContext(
  inferred: AppContext,
  overrides: Partial<AppContext>
): AppContext {
  return {
    name: overrides.name || inferred.name,
    description: overrides.description || inferred.description,
    domain: overrides.domain || inferred.domain,
    keyEntities: overrides.keyEntities || inferred.keyEntities,
    features: overrides.features || inferred.features,
  }
}
