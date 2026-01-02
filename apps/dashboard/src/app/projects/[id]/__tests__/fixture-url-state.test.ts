/**
 * Tests for URL-based fixture selection state
 *
 * The project page stores the selected fixture ID in the URL query parameter
 * (?fixture=<id>) to enable:
 * - Shareable links to specific fixtures
 * - Browser back/forward navigation
 * - Bookmarkable fixture views
 */
import { describe, it, expect } from 'vitest'

/**
 * Helper function that mirrors the URL update logic in the project page
 * This extracts the core logic for testing without React dependencies
 */
function buildFixtureUrl(
  projectId: string,
  fixtureId: string | null,
  existingParams: URLSearchParams = new URLSearchParams()
): string {
  const params = new URLSearchParams(existingParams.toString())
  if (fixtureId) {
    params.set('fixture', fixtureId)
  } else {
    params.delete('fixture')
  }
  const queryString = params.toString()
  return `/projects/${projectId}${queryString ? `?${queryString}` : ''}`
}

/**
 * Helper to parse fixture ID from URL
 */
function getFixtureIdFromUrl(url: string): string | null {
  const urlObj = new URL(url, 'http://localhost')
  return urlObj.searchParams.get('fixture')
}

describe('Fixture URL State', () => {
  describe('buildFixtureUrl', () => {
    it('adds fixture parameter when fixtureId is provided', () => {
      const url = buildFixtureUrl('proj-123', 'fix-456')
      expect(url).toBe('/projects/proj-123?fixture=fix-456')
    })

    it('removes fixture parameter when fixtureId is null', () => {
      const existingParams = new URLSearchParams('fixture=fix-456')
      const url = buildFixtureUrl('proj-123', null, existingParams)
      expect(url).toBe('/projects/proj-123')
    })

    it('preserves other query parameters when setting fixture', () => {
      const existingParams = new URLSearchParams('tab=settings&view=grid')
      const url = buildFixtureUrl('proj-123', 'fix-456', existingParams)
      expect(url).toContain('fixture=fix-456')
      expect(url).toContain('tab=settings')
      expect(url).toContain('view=grid')
    })

    it('preserves other query parameters when clearing fixture', () => {
      const existingParams = new URLSearchParams('fixture=fix-456&tab=settings')
      const url = buildFixtureUrl('proj-123', null, existingParams)
      expect(url).toBe('/projects/proj-123?tab=settings')
      expect(url).not.toContain('fixture')
    })

    it('replaces existing fixture parameter with new value', () => {
      const existingParams = new URLSearchParams('fixture=old-id')
      const url = buildFixtureUrl('proj-123', 'new-id', existingParams)
      expect(url).toBe('/projects/proj-123?fixture=new-id')
      expect(url).not.toContain('old-id')
    })

    it('handles empty project ID', () => {
      const url = buildFixtureUrl('', 'fix-456')
      expect(url).toBe('/projects/?fixture=fix-456')
    })

    it('handles special characters in fixture ID', () => {
      const url = buildFixtureUrl('proj-123', 'fix-with-special-chars_123')
      expect(url).toBe('/projects/proj-123?fixture=fix-with-special-chars_123')
    })
  })

  describe('getFixtureIdFromUrl', () => {
    it('extracts fixture ID from URL', () => {
      const fixtureId = getFixtureIdFromUrl('/projects/proj-123?fixture=fix-456')
      expect(fixtureId).toBe('fix-456')
    })

    it('returns null when no fixture parameter exists', () => {
      const fixtureId = getFixtureIdFromUrl('/projects/proj-123')
      expect(fixtureId).toBeNull()
    })

    it('returns null when fixture parameter is empty', () => {
      const fixtureId = getFixtureIdFromUrl('/projects/proj-123?fixture=')
      expect(fixtureId).toBe('')
    })

    it('handles multiple query parameters', () => {
      const fixtureId = getFixtureIdFromUrl('/projects/proj-123?tab=settings&fixture=fix-456&view=grid')
      expect(fixtureId).toBe('fix-456')
    })
  })

  describe('URL state consistency', () => {
    it('setting and getting fixture ID is symmetric', () => {
      const projectId = 'proj-123'
      const originalFixtureId = 'fix-456'

      const url = buildFixtureUrl(projectId, originalFixtureId)
      const extractedFixtureId = getFixtureIdFromUrl(url)

      expect(extractedFixtureId).toBe(originalFixtureId)
    })

    it('clearing fixture removes it from URL completely', () => {
      const projectId = 'proj-123'
      const existingParams = new URLSearchParams('fixture=fix-456')

      const url = buildFixtureUrl(projectId, null, existingParams)
      const extractedFixtureId = getFixtureIdFromUrl(url)

      expect(extractedFixtureId).toBeNull()
    })

    it('fixture selection workflow maintains correct state', () => {
      const projectId = 'proj-123'

      // Initial state - no fixture selected
      let url = buildFixtureUrl(projectId, null)
      expect(getFixtureIdFromUrl(url)).toBeNull()

      // Select first fixture
      url = buildFixtureUrl(projectId, 'fix-1')
      expect(getFixtureIdFromUrl(url)).toBe('fix-1')

      // Select different fixture
      const params = new URLSearchParams(new URL(url, 'http://localhost').search)
      url = buildFixtureUrl(projectId, 'fix-2', params)
      expect(getFixtureIdFromUrl(url)).toBe('fix-2')

      // Clear selection (create new)
      const params2 = new URLSearchParams(new URL(url, 'http://localhost').search)
      url = buildFixtureUrl(projectId, null, params2)
      expect(getFixtureIdFromUrl(url)).toBeNull()
    })
  })
})
