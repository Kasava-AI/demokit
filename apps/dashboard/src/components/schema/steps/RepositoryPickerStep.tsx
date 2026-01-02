/**
 * RepositoryPickerStep Component
 *
 * Second step (GitHub only): Select a repository and branch.
 */

'use client'

import React, { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  GitBranch,
  Star,
  Lock,
  Globe,
  Calendar,
  Check,
  Loader2,
} from 'lucide-react'
import {
  useGitHubRepositories,
  useGitHubBranches,
} from '@/hooks/use-github-repositories'
import type { StepProps, GitHubRepository } from '../types'

interface RepositoryPickerStepProps extends StepProps {
  projectId: string
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

export function RepositoryPickerStep({
  state,
  onStateChange,
}: RepositoryPickerStepProps) {
  const [search, setSearch] = useState('')

  // Fetch repositories
  const {
    data,
    isLoading: isLoadingRepos,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGitHubRepositories({ search: search || undefined })

  // Flatten pages
  const repositories = useMemo(
    () => data?.pages.flatMap((p) => p.repositories) ?? [],
    [data]
  )

  // Fetch branches for selected repository
  const { data: branches, isLoading: isLoadingBranches } = useGitHubBranches(
    state.repository?.owner,
    state.repository?.name
  )

  const handleSelectRepository = (repo: GitHubRepository) => {
    onStateChange({
      repository: repo,
      branch: repo.defaultBranch,
      selectedFiles: [], // Reset files when repo changes
    })
  }

  const handleBranchChange = (branch: string) => {
    onStateChange({
      branch,
      selectedFiles: [], // Reset files when branch changes
    })
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search repositories..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Branch selector (when repo is selected) */}
      {state.repository && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <div className="flex-1">
            <div className="text-sm font-medium">{state.repository.fullName}</div>
            <div className="text-xs text-muted-foreground">
              {state.repository.description || 'No description'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <Select
              value={state.branch || undefined}
              onValueChange={handleBranchChange}
              disabled={isLoadingBranches}
            >
              <SelectTrigger className="w-40 h-8">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches?.map((branch) => (
                  <SelectItem key={branch.name} value={branch.name}>
                    <div className="flex items-center gap-2">
                      {branch.name}
                      {branch.protected && (
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Repository list */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {isLoadingRepos ? (
          // Loading skeletons
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-3 border rounded-lg">
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))
        ) : repositories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {search ? 'No repositories found' : 'No repositories available'}
          </div>
        ) : (
          <>
            {repositories.map((repo) => (
              <div
                key={repo.id}
                className={`p-3 border rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
                  state.repository?.id === repo.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : ''
                }`}
                onClick={() => handleSelectRepository(repo)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{repo.name}</span>
                      {repo.private ? (
                        <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                      ) : (
                        <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                      {repo.language && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {repo.language}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {repo.owner}/{repo.name}
                    </div>
                    {repo.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {repo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {repo.starCount > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {repo.starCount}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Updated {formatTimeAgo(repo.updatedAt)}
                      </div>
                    </div>
                  </div>
                  {state.repository?.id === repo.id && (
                    <Check className="h-5 w-5 text-primary shrink-0 ml-2" />
                  )}
                </div>
              </div>
            ))}

            {/* Load more button */}
            {hasNextPage && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load more repositories'
                )}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
