'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react'
import { useOrganizations, type Organization } from '@/hooks/use-organization'

const STORAGE_KEY = 'demokit-selected-org-id'

interface OrganizationContextType {
  /** The currently selected organization */
  currentOrg: Organization | null
  /** All organizations the user belongs to */
  organizations: Organization[]
  /** Whether organizations are being loaded */
  isLoading: boolean
  /** Error if organizations failed to load */
  error: Error | null
  /** Switch to a different organization by ID */
  switchOrg: (orgId: string) => void
  /** Check if user has multiple organizations */
  hasMultipleOrgs: boolean
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
)

/**
 * Get the stored organization ID from localStorage.
 * Returns null if not found or if running on server.
 */
function getStoredOrgId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/**
 * Store the selected organization ID in localStorage.
 */
function setStoredOrgId(orgId: string | null): void {
  if (typeof window === 'undefined') return
  try {
    if (orgId) {
      localStorage.setItem(STORAGE_KEY, orgId)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Ignore localStorage errors (e.g., private browsing mode)
  }
}

export function OrganizationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(() =>
    getStoredOrgId()
  )

  // Fetch organizations (always enabled in OSS mode - no auth check needed)
  const {
    data: organizations = [],
    isLoading,
    error,
  } = useOrganizations({
    enabled: true,
  })

  // Find the current organization from the list
  const currentOrg = useMemo(() => {
    if (organizations.length === 0) return null

    // If we have a selected org ID, try to find it
    if (selectedOrgId) {
      const found = organizations.find((org) => org.id === selectedOrgId)
      if (found) return found
    }

    // Fall back to first organization
    return organizations[0]
  }, [organizations, selectedOrgId])

  // Sync selectedOrgId when currentOrg changes (auto-select first org)
  useEffect(() => {
    if (currentOrg && currentOrg.id !== selectedOrgId) {
      setSelectedOrgId(currentOrg.id)
      setStoredOrgId(currentOrg.id)
    }
  }, [currentOrg, selectedOrgId])

  // Switch to a different organization
  const switchOrg = useCallback(
    (orgId: string) => {
      // Verify the org exists in user's organizations
      const org = organizations.find((o) => o.id === orgId)
      if (org) {
        console.log('[OrganizationContext] Switching to org:', {
          orgId,
          orgName: org.name,
        })
        setSelectedOrgId(orgId)
        setStoredOrgId(orgId)
      } else {
        console.warn(
          '[OrganizationContext] Attempted to switch to unknown org:',
          orgId
        )
      }
    },
    [organizations]
  )

  const hasMultipleOrgs = organizations.length > 1

  const value = useMemo(
    () => ({
      currentOrg,
      organizations,
      isLoading,
      error,
      switchOrg,
      hasMultipleOrgs,
    }),
    [currentOrg, organizations, isLoading, error, switchOrg, hasMultipleOrgs]
  )

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  )
}

/**
 * Hook to access the organization context.
 * Must be used within an OrganizationProvider.
 */
export function useOrganizationContext() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error(
      'useOrganizationContext must be used within an OrganizationProvider'
    )
  }
  return context
}

/**
 * Hook to get just the current organization.
 * Convenience wrapper around useOrganizationContext.
 */
export function useCurrentOrganization() {
  const { currentOrg, isLoading, error, switchOrg } = useOrganizationContext()
  return { currentOrg, isLoading, error, switchOrg }
}
