/**
 * Hook for managing GitHub OAuth connection.
 * Handles checking connection status, initiating OAuth, and disconnecting.
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { GitHubConnection } from '@/components/schema/types'

const GITHUB_CONNECTION_KEY = ['github-connection']

/**
 * Fetch the current GitHub connection for the organization.
 */
async function fetchGitHubConnection(): Promise<GitHubConnection | null> {
  const res = await fetch('/api/github/connection')

  if (res.status === 404) {
    return null
  }

  if (!res.ok) {
    throw new Error('Failed to fetch GitHub connection')
  }

  return res.json()
}

/**
 * Disconnect the GitHub connection.
 */
async function disconnectGitHub(): Promise<void> {
  const res = await fetch('/api/github/connection', {
    method: 'DELETE',
  })

  if (!res.ok) {
    throw new Error('Failed to disconnect GitHub')
  }
}

/**
 * Initiate GitHub OAuth flow.
 * Returns the OAuth URL to redirect to.
 */
async function initiateGitHubOAuth(): Promise<string> {
  const res = await fetch('/api/github/connect', {
    method: 'POST',
  })

  if (!res.ok) {
    throw new Error('Failed to initiate GitHub OAuth')
  }

  const data = await res.json()
  return data.url
}

/**
 * Hook for checking GitHub connection status.
 */
export function useGitHubConnection() {
  return useQuery({
    queryKey: GITHUB_CONNECTION_KEY,
    queryFn: fetchGitHubConnection,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: 'always',
  })
}

/**
 * Hook for disconnecting GitHub.
 */
export function useDisconnectGitHub() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: disconnectGitHub,
    onSuccess: () => {
      queryClient.setQueryData(GITHUB_CONNECTION_KEY, null)
      queryClient.invalidateQueries({ queryKey: ['github-repositories'] })
    },
  })
}

/**
 * Hook for initiating GitHub OAuth.
 */
export function useConnectGitHub() {
  return useMutation({
    mutationFn: async () => {
      const url = await initiateGitHubOAuth()
      // Open OAuth in a popup window
      const width = 600
      const height = 700
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2

      const popup = window.open(
        url,
        'GitHub OAuth',
        `width=${width},height=${height},left=${left},top=${top},popup=1`
      )

      if (!popup) {
        // Fallback to redirect if popup blocked
        window.location.href = url
      }

      return popup
    },
  })
}

/**
 * Combined hook for GitHub connection management.
 * @param _organizationId - Optional organization ID (unused in OSS, for cloud compatibility)
 */
export function useGitHubConnectionManager(_organizationId?: string) {
  const connection = useGitHubConnection()
  const disconnect = useDisconnectGitHub()
  const connect = useConnectGitHub()

  return {
    connection: connection.data,
    isConnected: !!connection.data,
    isLoading: connection.isLoading,
    isConnecting: connect.isPending,
    isDisconnecting: disconnect.isPending,
    error: connection.error || disconnect.error || connect.error,
    connect: connect.mutate,
    disconnect: disconnect.mutate,
    refetch: connection.refetch,
  }
}
