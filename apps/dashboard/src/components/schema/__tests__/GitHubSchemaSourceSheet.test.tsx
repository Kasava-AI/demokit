/**
 * Tests for GitHubSchemaSourceSheet component
 *
 * Tests the multi-step sheet flow for importing schemas from GitHub or file uploads.
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

// Mock the Sheet components
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-header">{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="sheet-title">{children}</h2>
  ),
  SheetDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="sheet-description">{children}</p>
  ),
  SheetFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-footer">{children}</div>
  ),
}))

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
}))

import { GitHubSchemaSourceSheet } from '../GitHubSchemaSourceSheet'

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

describe('GitHubSchemaSourceSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when open', () => {
    render(
      <GitHubSchemaSourceSheet
        projectId="test-project"
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByTestId('sheet')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <GitHubSchemaSourceSheet
        projectId="test-project"
        open={false}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.queryByTestId('sheet')).not.toBeInTheDocument()
  })

  it('shows method selection step initially', () => {
    render(
      <GitHubSchemaSourceSheet
        projectId="test-project"
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByTestId('sheet-title')).toHaveTextContent(
      'Choose Import Method'
    )
  })

  it('shows GitHub and Upload options in method step', () => {
    render(
      <GitHubSchemaSourceSheet
        projectId="test-project"
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText(/Connect to GitHub/i)).toBeInTheDocument()
    expect(screen.getByText(/Upload Files/i)).toBeInTheDocument()
  })

  it('calls onOpenChange when close button is clicked', async () => {
    const onOpenChange = vi.fn()
    render(
      <GitHubSchemaSourceSheet
        projectId="test-project"
        open={true}
        onOpenChange={onOpenChange}
      />,
      { wrapper: createWrapper() }
    )

    // Find and click the Cancel button in the footer
    const cancelButton = screen.getByRole('button', { name: /Cancel/i })
    fireEvent.click(cancelButton)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe('GitHubSchemaSourceSheet step navigation', () => {
  it('shows progress indicator with correct step count', () => {
    render(
      <GitHubSchemaSourceSheet
        projectId="test-project"
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    )

    // Check for step indicator (Step X of Y)
    expect(screen.getByText(/Step 1 of/i)).toBeInTheDocument()
  })
})
