import { vi } from 'vitest'
import type { LocalUser } from '@/contexts/auth-context'

/**
 * Mock user factory - creates a mock LocalUser object for OSS mode
 */
export function createMockUser(overrides: Partial<LocalUser> = {}): LocalUser {
  return {
    id: 'user-123',
    email: 'test@example.com',
    user_metadata: {
      name: 'Test User',
      avatar_url: 'https://example.com/avatar.png',
    },
    ...overrides,
  }
}

/**
 * Mock database user record
 */
export function createMockDbUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    fullName: 'Test User',
    avatarUrl: 'https://example.com/avatar.png',
    preferences: {},
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

/**
 * Mock organization record
 */
export function createMockOrganization(overrides: Record<string, unknown> = {}) {
  return {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org',
    settings: {},
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

/**
 * Mock organization membership record
 */
export function createMockMembership(overrides: Record<string, unknown> = {}) {
  return {
    id: 'membership-123',
    userId: 'user-123',
    organizationId: 'org-123',
    role: 'owner' as const,
    joinedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

/**
 * Mock project record
 */
export function createMockProject(overrides: Record<string, unknown> = {}) {
  return {
    id: 'project-123',
    organizationId: 'org-123',
    name: 'Test Project',
    description: 'A test project',
    status: 'pending' as const,
    schema: null,
    settings: {},
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

/**
 * Mock template record
 */
export function createMockTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'template-123',
    projectId: 'project-123',
    name: 'Test Template',
    category: 'api' as const,
    narrative: { summary: 'Test summary' },
    instructions: { steps: [] },
    preview: null,
    relevanceScore: 100,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

/**
 * Mock fixture record
 */
export function createMockFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fixture-123',
    projectId: 'project-123',
    templateId: 'template-123',
    name: 'Test Fixture',
    status: 'pending' as const,
    data: null,
    validatedAt: null,
    validationNotes: null,
    createdById: 'user-123',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

/**
 * Mock app identity record
 */
export function createMockAppIdentity(overrides: Record<string, unknown> = {}) {
  return {
    id: 'identity-123',
    projectId: 'project-123',
    name: 'Test App',
    description: 'A test application',
    domain: 'test.com',
    metadata: {},
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

/**
 * Mock feature record
 */
export function createMockFeature(overrides: Record<string, unknown> = {}) {
  return {
    id: 'feature-123',
    projectId: 'project-123',
    name: 'Test Feature',
    description: 'A test feature',
    category: 'core',
    priority: 1,
    metadata: {},
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

/**
 * Mock user journey record
 */
export function createMockUserJourney(overrides: Record<string, unknown> = {}) {
  return {
    id: 'journey-123',
    projectId: 'project-123',
    name: 'Test Journey',
    description: 'A test user journey',
    steps: [],
    metadata: {},
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

/**
 * Mock project source record
 */
export function createMockProjectSource(overrides: Record<string, unknown> = {}) {
  return {
    id: 'source-123',
    projectId: 'project-123',
    type: 'website' as const,
    url: 'https://example.com',
    content: null,
    extractedContent: null,
    fetchStatus: 'pending' as const,
    fetchError: null,
    lastFetchedAt: null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

/**
 * Mock entity map record
 */
export function createMockEntityMap(overrides: Record<string, unknown> = {}) {
  return {
    id: 'entity-map-123',
    projectId: 'project-123',
    modelName: 'User',
    displayName: 'Customer',
    purpose: 'Represents a customer in the system',
    businessRelationships: [],
    importantFields: ['email', 'name'],
    genericFields: ['id'],
    confidence: 0.9,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

/**
 * Create a mock database with chainable query interface.
 * The mock is designed to work with Drizzle ORM's query patterns.
 */
export function createMockDb() {
  const mockDb = {
    query: {
      users: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      organizations: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      organizationMembers: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      projects: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      appIdentity: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      features: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      userJourneys: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      entityMaps: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      projectSources: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      templates: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      fixtures: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      fixtureGenerations: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  }

  return mockDb
}

export type MockDb = ReturnType<typeof createMockDb>

/**
 * Helper to create a mock Request object
 */
export function createMockRequest(
  url: string,
  options: RequestInit = {}
): Request {
  return new Request(`http://localhost${url}`, options)
}

/**
 * Helper to create a mock NextRequest object for testing Next.js API routes.
 * NextRequest extends Request with additional properties like cookies, nextUrl, etc.
 * We cast the Request to NextRequest for testing purposes.
 */
export function createMockNextRequest(
  url: string,
  options: RequestInit = {}
): import('next/server').NextRequest {
  const request = new Request(`http://localhost${url}`, options)
  // Cast to NextRequest - the route handlers typically only use base Request methods
  return request as unknown as import('next/server').NextRequest
}

/**
 * Helper to parse JSON from NextResponse
 */
export async function parseResponse<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>
}
