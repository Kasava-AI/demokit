/**
 * Tests for CodebaseFileUploader component
 *
 * Tests the drag-and-drop file upload functionality.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

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

// Mock react-dropzone
vi.mock('react-dropzone', () => ({
  useDropzone: vi.fn(() => ({
    getRootProps: () => ({
      onClick: vi.fn(),
      'data-testid': 'dropzone',
    }),
    getInputProps: () => ({
      type: 'file',
      'data-testid': 'file-input',
    }),
    isDragActive: false,
  })),
}))

import { CodebaseFileUploader } from '../CodebaseFileUploader'
import type { CodebaseFile } from '../types'

describe('CodebaseFileUploader', () => {
  const mockOnFilesChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dropzone area', () => {
    render(
      <CodebaseFileUploader files={[]} onFilesChange={mockOnFilesChange} />
    )

    expect(screen.getByTestId('dropzone')).toBeInTheDocument()
    expect(screen.getByText(/Drag & drop schema files here/i)).toBeInTheDocument()
  })

  it('shows uploaded files', () => {
    const files: CodebaseFile[] = [
      { path: 'schema.ts', content: 'export interface User {}' },
      { path: 'models.prisma', content: 'model User {}' },
    ]

    render(
      <CodebaseFileUploader files={files} onFilesChange={mockOnFilesChange} />
    )

    expect(screen.getByText('schema.ts')).toBeInTheDocument()
    expect(screen.getByText('models.prisma')).toBeInTheDocument()
  })

  it('shows file count when files are uploaded', () => {
    const files: CodebaseFile[] = [
      { path: 'schema.ts', content: 'export interface User {}' },
      { path: 'models.ts', content: 'export type Product = {}' },
    ]

    render(
      <CodebaseFileUploader files={files} onFilesChange={mockOnFilesChange} />
    )

    expect(screen.getByText(/2 files selected/i)).toBeInTheDocument()
  })

  it('allows removing files', () => {
    const files: CodebaseFile[] = [
      { path: 'schema.ts', content: 'export interface User {}' },
    ]

    render(
      <CodebaseFileUploader files={files} onFilesChange={mockOnFilesChange} />
    )

    // Find the remove button (X icon button)
    const removeButtons = screen.getAllByRole('button')
    const removeButton = removeButtons.find((btn) =>
      btn.querySelector('svg.lucide-x')
    )

    if (removeButton) {
      fireEvent.click(removeButton)
      expect(mockOnFilesChange).toHaveBeenCalledWith([])
    }
  })

  it('shows supported file types hint', () => {
    render(
      <CodebaseFileUploader files={[]} onFilesChange={mockOnFilesChange} />
    )

    expect(screen.getByText(/Supported:/i)).toBeInTheDocument()
    expect(screen.getByText(/TypeScript/i)).toBeInTheDocument()
    expect(screen.getByText(/Prisma/i)).toBeInTheDocument()
    expect(screen.getByText(/GraphQL/i)).toBeInTheDocument()
  })

  it('detects TypeScript format for .ts files', () => {
    const files: CodebaseFile[] = [
      { path: 'types.ts', content: 'export interface User { id: string }' },
    ]

    render(
      <CodebaseFileUploader files={files} onFilesChange={mockOnFilesChange} />
    )

    expect(screen.getByText('TypeScript')).toBeInTheDocument()
  })

  it('detects Prisma format for .prisma files', () => {
    const files: CodebaseFile[] = [
      { path: 'schema.prisma', content: 'model User { id Int @id }' },
    ]

    render(
      <CodebaseFileUploader files={files} onFilesChange={mockOnFilesChange} />
    )

    expect(screen.getByText('Prisma')).toBeInTheDocument()
  })

  it('detects Drizzle format from content', () => {
    const files: CodebaseFile[] = [
      {
        path: 'schema.ts',
        content: "export const users = pgTable('users', { id: serial() })",
      },
    ]

    render(
      <CodebaseFileUploader files={files} onFilesChange={mockOnFilesChange} />
    )

    expect(screen.getByText('Drizzle')).toBeInTheDocument()
  })

  it('detects Zod format from content', () => {
    const files: CodebaseFile[] = [
      {
        path: 'schema.ts',
        content: 'export const userSchema = z.object({ name: z.string() })',
      },
    ]

    render(
      <CodebaseFileUploader files={files} onFilesChange={mockOnFilesChange} />
    )

    expect(screen.getByText('Zod')).toBeInTheDocument()
  })
})
