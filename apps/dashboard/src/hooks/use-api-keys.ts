import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'

/**
 * Supported AI providers for BYOK
 */
export type AIProvider = 'anthropic' | 'voyage' | 'openai' | 'google'

/**
 * Provider preference for how to source API keys
 */
export type KeyPreference = 'byok' | 'platform' | 'disabled'

/**
 * API key metadata (never includes the actual key)
 */
export interface ApiKeyInfo {
  id: string
  provider: AIProvider
  keyPrefix: string | null
  keyLastFour: string | null
  label: string | null
  isEnabled: boolean
  isValidated: boolean
  lastValidatedAt: string | null
  validationError: string | null
  lastUsedAt: string | null
  usageCount: string
  createdAt: string
  updatedAt: string
}

/**
 * Organization key preferences
 */
export interface KeyPreferences {
  preferByok: boolean
  anthropicPreference: KeyPreference | null
  voyagePreference: KeyPreference | null
  openaiPreference: KeyPreference | null
  googlePreference: KeyPreference | null
}

/**
 * API keys response from the server
 */
export interface ApiKeysResponse {
  keys: ApiKeyInfo[]
  preferences: KeyPreferences
}

/**
 * Input for adding/updating an API key
 */
export interface AddApiKeyInput {
  provider: AIProvider
  apiKey: string
  label?: string
}

// Provider display info
export const PROVIDER_INFO: Record<
  AIProvider,
  { name: string; description: string; keyPrefix: string }
> = {
  anthropic: {
    name: 'Anthropic',
    description: 'Claude models for narrative-driven generation (L3)',
    keyPrefix: 'sk-ant-',
  },
  voyage: {
    name: 'Voyage AI',
    description: 'Code embeddings for source intelligence',
    keyPrefix: 'pa-',
  },
  openai: {
    name: 'OpenAI',
    description: 'GPT models for alternative generation',
    keyPrefix: 'sk-',
  },
  google: {
    name: 'Google AI',
    description: 'Gemini models and Vertex AI',
    keyPrefix: 'AIza',
  },
}

async function fetchApiKeys(organizationId: string): Promise<ApiKeysResponse> {
  const res = await fetch(`/api/organizations/${organizationId}/api-keys`)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch API keys')
  }
  return res.json()
}

async function addApiKey(
  organizationId: string,
  input: AddApiKeyInput
): Promise<ApiKeyInfo> {
  const res = await fetch(`/api/organizations/${organizationId}/api-keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to save API key')
  }
  return res.json()
}

async function deleteApiKey(
  organizationId: string,
  provider: AIProvider
): Promise<void> {
  const res = await fetch(
    `/api/organizations/${organizationId}/api-keys?provider=${provider}`,
    { method: 'DELETE' }
  )
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to delete API key')
  }
}

/**
 * Hook to fetch API keys for an organization.
 *
 * @param organizationId - The organization ID
 * @param options - Additional query options
 */
export function useApiKeys(
  organizationId: string | undefined,
  options?: Omit<UseQueryOptions<ApiKeysResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['api-keys', organizationId],
    queryFn: () => fetchApiKeys(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  })
}

/**
 * Hook to add or update an API key.
 *
 * @param organizationId - The organization ID
 */
export function useAddApiKey(organizationId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: AddApiKeyInput) => {
      if (!organizationId) throw new Error('Organization ID is required')
      return addApiKey(organizationId, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', organizationId] })
    },
  })
}

/**
 * Hook to delete an API key.
 *
 * @param organizationId - The organization ID
 */
export function useDeleteApiKey(organizationId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (provider: AIProvider) => {
      if (!organizationId) throw new Error('Organization ID is required')
      return deleteApiKey(organizationId, provider)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', organizationId] })
    },
  })
}
