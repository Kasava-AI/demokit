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
    onStateChange: vi.fn(),
    onNext: vi.fn(),
    onBack: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders GitHub and Upload options', () => {
    render(<MethodSelectionStep {...mockProps} />, { wrapper: createWrapper() })

    expect(screen.getByText(/Connect to GitHub/i)).toBeInTheDocument()
    expect(screen.getByText(/Upload Files/i)).toBeInTheDocument()
  })

  it('shows supported formats', () => {
    render(<MethodSelectionStep {...mockProps} />, { wrapper: createWrapper() })

    expect(screen.getByText(/TypeScript/i)).toBeInTheDocument()
    expect(screen.getByText(/Zod/i)).toBeInTheDocument()
    expect(screen.getByText(/Drizzle/i)).toBeInTheDocument()
    expect(screen.getByText(/Prisma/i)).toBeInTheDocument()
  })
})

describe('RepositoryPickerStep', () => {
  const mockProps = {
    state: {
      ...createDefaultState(),
      step: 'repository' as const,
      method: 'github' as const,
    },
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

    expect(
      screen.getByText(/No repositories found/i)
    ).toBeInTheDocument()
  })
})

describe('SchemaFileSelectorStep', () => {
  const mockProps = {
    state: {
      ...createDefaultState(),
      step: 'files' as const,
      method: 'github' as const,
      repository: { owner: 'test', name: 'repo', fullName: 'test/repo' },
      branch: 'main',
    },
    onStateChange: vi.fn(),
    onNext: vi.fn(),
    onBack: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state when discovering files', () => {
    const { useSchemaDiscovery } = require('@/hooks/use-github-repositories')
    useSchemaDiscovery.mockReturnValue({
      data: undefined,
      isLoading: true,
    })

    render(<SchemaFileSelectorStep {...mockProps} />, {
      wrapper: createWrapper(),
    })

    expect(screen.getByText(/Discovering schema files/i)).toBeInTheDocument()
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

    expect(screen.getByText('1')).toBeInTheDocument() // Model count
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
