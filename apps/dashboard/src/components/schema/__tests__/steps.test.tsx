/**
 * Tests for individual step components
 *
 * Tests each step in the schema import flow.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock window.matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock the hooks
vi.mock('@/hooks/use-github-connection', () => ({
  useGitHubConnection: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
  useConnectGitHub: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  // MethodSelectionStep now calls the combined manager hook directly instead
  // of useGitHubConnection/useConnectGitHub separately.
  useGitHubConnectionManager: vi.fn(() => ({
    connection: null,
    isConnected: false,
    isLoading: false,
    isConnecting: false,
    isDisconnecting: false,
    error: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    refetch: vi.fn(),
  })),
}))

vi.mock('@/hooks/use-github-repositories', () => ({
  useGitHubRepositories: vi.fn(() => ({
    data: { pages: [] },
    isLoading: false,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
  })),
  useGitHubBranches: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useSchemaDiscovery: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
  fetchSchemaFiles: vi.fn(),
}))

vi.mock('@/hooks/use-schema-parser', () => ({
  useParseSchema: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useSaveSchema: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    isSuccess: false,
  })),
}))

import { useSchemaDiscovery } from '@/hooks/use-github-repositories'
import { MethodSelectionStep } from '../steps/MethodSelectionStep'
import { RepositoryPickerStep } from '../steps/RepositoryPickerStep'
import { SchemaFileSelectorStep } from '../steps/SchemaFileSelectorStep'
import { SchemaPreviewStep } from '../steps/SchemaPreviewStep'
import { ConfirmImportStep } from '../steps/ConfirmImportStep'
import type { SchemaImportState } from '../types'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

const createDefaultState = (): SchemaImportState => ({
  step: 'method',
  method: null,
  repository: null,
  branch: null,
  selectedFiles: [],
  uploadedFiles: [],
  parsedSchema: null,
  isLoading: false,
  error: null,
})

describe('MethodSelectionStep', () => {
  const mockProps = {
    state: createDefaultState(),
    projectId: 'project-123',
    onStateChange: vi.fn(),
    onNext: vi.fn(),
    onBack: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders GitHub and Upload options', () => {
    render(<MethodSelectionStep {...mockProps} />, { wrapper: createWrapper() })

    // "Connect to GitHub" appears both in the card heading area's body copy
    // and could match loosely — assert on the (unique) card titles instead.
    expect(screen.getByText('Import from GitHub')).toBeInTheDocument()
    expect(screen.getByText('Upload Files')).toBeInTheDocument()
  })

  it('shows supported formats', () => {
    render(<MethodSelectionStep {...mockProps} />, { wrapper: createWrapper() })

    // The GitHub card's own body copy also mentions these same format names
    // ("...detect schema files (TypeScript, Zod, Drizzle, Prisma)"), so a
    // bare text match is ambiguous — scope to the format Badges themselves.
    expect(screen.getByText('TypeScript', { selector: '[data-slot="badge"]' })).toBeInTheDocument()
    expect(screen.getByText('Zod', { selector: '[data-slot="badge"]' })).toBeInTheDocument()
    expect(screen.getByText('Drizzle', { selector: '[data-slot="badge"]' })).toBeInTheDocument()
    expect(screen.getByText('Prisma', { selector: '[data-slot="badge"]' })).toBeInTheDocument()
  })
})

describe('RepositoryPickerStep', () => {
  const mockProps = {
    state: {
      ...createDefaultState(),
      step: 'repository' as const,
      method: 'github' as const,
    },
    projectId: 'project-123',
    onStateChange: vi.fn(),
    onNext: vi.fn(),
    onBack: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders repository search input', () => {
    render(<RepositoryPickerStep {...mockProps} />, {
      wrapper: createWrapper(),
    })

    expect(
      screen.getByPlaceholderText(/Search repositories/i)
    ).toBeInTheDocument()
  })

  it('shows empty state when no repositories', () => {
    render(<RepositoryPickerStep {...mockProps} />, {
      wrapper: createWrapper(),
    })

    // Current copy is "No repositories available" (was "...found").
    expect(
      screen.getByText(/No repositories available/i)
    ).toBeInTheDocument()
  })
})

describe('SchemaFileSelectorStep', () => {
  const mockProps = {
    state: {
      ...createDefaultState(),
      step: 'files' as const,
      method: 'github' as const,
      repository: {
        id: 1,
        owner: 'test',
        name: 'repo',
        fullName: 'test/repo',
        description: null,
        defaultBranch: 'main',
        private: false,
        updatedAt: '2024-01-01T00:00:00Z',
        pushedAt: null,
        language: 'TypeScript',
        starCount: 0,
      },
      branch: 'main',
    },
    projectId: 'project-123',
    onStateChange: vi.fn(),
    onNext: vi.fn(),
    onBack: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state when discovering files', () => {
    // require() doesn't resolve the "@/..." alias under Vitest's ESM runner —
    // reference the (mocked, via vi.mock above) import directly instead.
    vi.mocked(useSchemaDiscovery).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useSchemaDiscovery>)

    const { container } = render(<SchemaFileSelectorStep {...mockProps} />, {
      wrapper: createWrapper(),
    })

    // Current loading state renders Skeleton placeholder rows (4 of them),
    // not a "Discovering schema files" text message.
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })
})

describe('SchemaPreviewStep', () => {
  const mockProps = {
    state: {
      ...createDefaultState(),
      step: 'preview' as const,
      method: 'upload' as const,
      uploadedFiles: [{ path: 'schema.ts', content: 'export interface User {}' }],
      parsedSchema: {
        schema: {
          info: { title: 'Test Schema', version: '1.0.0' },
          endpoints: [],
          models: {
            User: {
              name: 'User',
              type: 'object' as const,
              properties: {
                id: { name: 'id', type: 'string' as const, required: true },
              },
              required: ['id'],
            },
          },
          relationships: [],
        },
        format: 'typescript' as const,
        warnings: [],
        parsedFiles: ['schema.ts'],
        models: [
          {
            name: 'User',
            propertyCount: 1,
            required: ['id'],
            type: 'object' as const,
          },
        ],
        relationships: [],
      },
      isLoading: false,
    },
    onStateChange: vi.fn(),
    onNext: vi.fn(),
    onBack: vi.fn(),
    projectId: 'test-project',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows parsed model count', () => {
    render(<SchemaPreviewStep {...mockProps} />, { wrapper: createWrapper() })

    // The summary strip has separate Models/Relationships/Files/Format
    // tiles; this fixture's model count (1) and parsed-file count (1) are
    // the same value, so a bare '1' text match is ambiguous — scope to the
    // stat tile labeled "Models".
    const modelsLabel = screen.getByText('Models')
    expect(modelsLabel.previousElementSibling).toHaveTextContent('1')
  })

  it('shows schema format', () => {
    render(<SchemaPreviewStep {...mockProps} />, { wrapper: createWrapper() })

    expect(screen.getByText('typescript')).toBeInTheDocument()
  })
})

describe('ConfirmImportStep', () => {
  const mockProps = {
    state: {
      ...createDefaultState(),
      step: 'confirm' as const,
      method: 'upload' as const,
      uploadedFiles: [{ path: 'schema.ts', content: 'export interface User {}' }],
      parsedSchema: {
        schema: {
          info: { title: 'Test Schema', version: '1.0.0' },
          endpoints: [],
          models: {
            User: {
              name: 'User',
              type: 'object' as const,
              properties: {},
              required: [],
            },
          },
          relationships: [],
        },
        format: 'typescript' as const,
        warnings: [],
        parsedFiles: ['schema.ts'],
        models: [{ name: 'User', propertyCount: 0, required: [], type: 'object' as const }],
        relationships: [],
      },
      isLoading: false,
    },
    onStateChange: vi.fn(),
    onNext: vi.fn(),
    onBack: vi.fn(),
    projectId: 'test-project',
    onComplete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows import summary', () => {
    render(<ConfirmImportStep {...mockProps} />, { wrapper: createWrapper() })

    expect(screen.getByText(/Import Source/i)).toBeInTheDocument()
    expect(screen.getByText(/Schema Summary/i)).toBeInTheDocument()
  })

  it('shows confirmation checkbox', () => {
    render(<ConfirmImportStep {...mockProps} />, { wrapper: createWrapper() })

    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('disables import button until checkbox is checked', () => {
    render(<ConfirmImportStep {...mockProps} />, { wrapper: createWrapper() })

    const importButton = screen.getByRole('button', { name: /Import Schema/i })
    expect(importButton).toBeDisabled()
  })

  it('enables import button when checkbox is checked', () => {
    render(<ConfirmImportStep {...mockProps} />, { wrapper: createWrapper() })

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    const importButton = screen.getByRole('button', { name: /Import Schema/i })
    expect(importButton).not.toBeDisabled()
  })
})
