/**
 * Hook for fetching and managing GitHub repositories.
 * Supports searching, listing branches, and fetching file trees.
 */

'use client'

import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import type {
  GitHubRepository,
  GitHubBranch,
  DiscoveredSchemaFile,
  CodebaseFile,
} from '@/components/schema/types'

/**
 * Fetch repositories from the connected GitHub account.
 */
async function fetchRepositories(options?: {
  search?: string
  page?: number
  perPage?: number
}): Promise<{ repositories: GitHubRepository[]; hasMore: boolean }> {
  const params = new URLSearchParams()
  if (options?.search) params.set('search', options.search)
  if (options?.page) params.set('page', String(options.page))
  if (options?.perPage) params.set('per_page', String(options.perPage))

  const res = await fetch(`/api/github/repositories?${params}`)

  if (!res.ok) {
    throw new Error('Failed to fetch repositories')
  }

  return res.json()
}

/**
 * Fetch branches for a repository.
 */
async function fetchBranches(
  owner: string,
  repo: string
): Promise<GitHubBranch[]> {
  const res = await fetch(`/api/github/repos/${owner}/${repo}/branches`)

  if (!res.ok) {
    throw new Error('Failed to fetch branches')
  }

  return res.json()
}

/**
 * Discover schema files in a repository.
 * Uses heuristics to find TypeScript, Zod, Drizzle, Prisma, etc. schema files.
 */
async function discoverSchemaFiles(
  owner: string,
  repo: string,
  branch: string
): Promise<DiscoveredSchemaFile[]> {
  const res = await fetch(
    `/api/github/repos/${owner}/${repo}/schema-files?branch=${encodeURIComponent(branch)}`
  )

  if (!res.ok) {
    throw new Error('Failed to discover schema files')
  }

  return res.json()
}

/**
 * Fetch file content from a repository.
 */
async function fetchFileContent(
  owner: string,
  repo: string,
  branch: string,
  path: string
): Promise<CodebaseFile> {
  const res = await fetch(
    `/api/github/repos/${owner}/${repo}/content?branch=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}`
  )

  if (!res.ok) {
    throw new Error('Failed to fetch file content')
  }

  return res.json()
}

/**
 * Fetch multiple files' content from a repository.
 */
async function fetchFilesContent(
  owner: string,
  repo: string,
  branch: string,
  paths: string[]
): Promise<CodebaseFile[]> {
  const res = await fetch(`/api/github/repos/${owner}/${repo}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ branch, paths }),
  })

  if (!res.ok) {
    throw new Error('Failed to fetch files')
  }

  return res.json()
}

/**
 * Hook for listing repositories with search and pagination.
 */
export function useGitHubRepositories(options?: { search?: string }) {
  return useInfiniteQuery({
    queryKey: ['github-repositories', options?.search],
    queryFn: ({ pageParam = 1 }) =>
      fetchRepositories({ search: options?.search, page: pageParam, perPage: 20 }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length + 1 : undefined,
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Hook for fetching branches for a repository.
 */
export function useGitHubBranches(owner?: string, repo?: string) {
  return useQuery({
    queryKey: ['github-branches', owner, repo],
    queryFn: () => fetchBranches(owner!, repo!),
    enabled: !!owner && !!repo,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook for discovering schema files in a repository.
 */
export function useSchemaDiscovery(
  owner?: string,
  repo?: string,
  branch?: string
) {
  return useQuery({
    queryKey: ['schema-discovery', owner, repo, branch],
    queryFn: () => discoverSchemaFiles(owner!, repo!, branch!),
    enabled: !!owner && !!repo && !!branch,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Hook for fetching a single file's content.
 */
export function useFileContent(
  owner?: string,
  repo?: string,
  branch?: string,
  path?: string
) {
  return useQuery({
    queryKey: ['file-content', owner, repo, branch, path],
    queryFn: () => fetchFileContent(owner!, repo!, branch!, path!),
    enabled: !!owner && !!repo && !!branch && !!path,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Utility function to fetch multiple files (not a hook).
 * Use this imperatively when you need to fetch files on demand.
 */
export async function fetchSchemaFiles(
  owner: string,
  repo: string,
  branch: string,
  paths: string[]
): Promise<CodebaseFile[]> {
  return fetchFilesContent(owner, repo, branch, paths)
}
