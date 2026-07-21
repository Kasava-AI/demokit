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

// Mock the Sheet components. The real SheetContent (see
// components/ui/sheet.tsx) renders a top-right icon button (accessible name
// "Close", from a Radix Dialog.Close under the Sheet's Root) that calls the
// onOpenChange the Sheet Root was given — there is no separate footer
// "Cancel" button in the current design (the footer only has Back/Next).
// The mock below reproduces that one real closing affordance so the "closes
// the sheet" behavior stays covered without pulling in the real Radix
// primitives.
let mockSheetOnOpenChange: ((open: boolean) => void) | undefined
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }) => {
    mockSheetOnOpenChange = onOpenChange
    return open ? <div data-testid="sheet">{children}</div> : null
  },
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">
      {children}
      <button type="button" aria-label="Close" onClick={() => mockSheetOnOpenChange?.(false)} />
    </div>
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

    // MethodSelectionStep's card headings — "Connect to GitHub" also appears
    // in this step's card body copy and in the sheet description, so assert
    // on the (unique) card titles rather than that shared substring.
    expect(screen.getByText('Import from GitHub')).toBeInTheDocument()
    expect(screen.getByText('Upload Files')).toBeInTheDocument()
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

    // The footer only has Back/Next(/Import) — there is no "Cancel" button.
    // The sheet's actual close affordance is the top-right icon button
    // (accessible name "Close") rendered by SheetContent.
    const closeButton = screen.getByRole('button', { name: /Close/i })
    fireEvent.click(closeButton)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe('GitHubSchemaSourceSheet step navigation', () => {
  it('shows progress indicator with correct step count', () => {
    // The current progress indicator is a row of numbered circles (no
    // "Step X of Y" text — that copy was replaced by the dot/circle
    // stepper), one per visible step: method, repository, files, preview,
    // confirm (5, since no method is chosen yet so the upload-only
    // "skip repository" filtering doesn't apply).
    const { container } = render(
      <GitHubSchemaSourceSheet
        projectId="test-project"
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() }
    )

    const stepCircles = container.querySelectorAll('.w-6.h-6.rounded-full')
    expect(stepCircles.length).toBe(5)
  })
})
