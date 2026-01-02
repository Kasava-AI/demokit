import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface HostedApiState {
  apiKey: string | null
  hostedEnabled: boolean
}

async function fetchHostedApiState(fixtureId: string): Promise<HostedApiState> {
  const res = await fetch(`/api/fixtures/${fixtureId}/hosted`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch hosted API state')
  }
  return res.json()
}

async function toggleHostedApi({
  fixtureId,
  enabled,
}: {
  fixtureId: string
  enabled: boolean
}): Promise<HostedApiState> {
  const res = await fetch(`/api/fixtures/${fixtureId}/hosted`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to toggle hosted API')
  }
  return res.json()
}

async function regenerateApiKey(fixtureId: string): Promise<HostedApiState> {
  const res = await fetch(`/api/fixtures/${fixtureId}/api-key`, {
    method: 'POST',
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to regenerate API key')
  }
  return res.json()
}

/**
 * Hook to manage hosted API settings for a fixture.
 * Provides API key, enabled state, and mutation functions.
 */
export function useHostedApi(fixtureId?: string) {
  const queryClient = useQueryClient()

  // Fetch current hosted API state
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['fixtures', fixtureId, 'hosted'],
    queryFn: () => fetchHostedApiState(fixtureId!),
    enabled: !!fixtureId,
    staleTime: 30 * 1000, // 30 seconds
  })

  // Toggle hosted API on/off
  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      toggleHostedApi({ fixtureId: fixtureId!, enabled }),
    onSuccess: (newState) => {
      queryClient.setQueryData(['fixtures', fixtureId, 'hosted'], newState)
    },
  })

  // Regenerate API key
  const regenerateKeyMutation = useMutation({
    mutationFn: () => regenerateApiKey(fixtureId!),
    onSuccess: (newState) => {
      queryClient.setQueryData(['fixtures', fixtureId, 'hosted'], newState)
    },
  })

  return {
    apiKey: data?.apiKey ?? null,
    hostedEnabled: data?.hostedEnabled ?? false,
    isLoading,
    error,
    isEnabling: toggleMutation.isPending,
    isRegeneratingKey: regenerateKeyMutation.isPending,
    toggleHosted: (enabled?: boolean) => {
      const newEnabled = enabled !== undefined ? enabled : !data?.hostedEnabled
      toggleMutation.mutate(newEnabled)
    },
    regenerateApiKey: () => regenerateKeyMutation.mutate(),
  }
}
