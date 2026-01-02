import { describe, it, expect } from 'vitest'
import { buildSourceIntelligenceContext, type SourceIntelligence } from '../ai-generator'

describe('buildSourceIntelligenceContext', () => {
  describe('when no source intelligence provided', () => {
    it('returns empty string for undefined', () => {
      const result = buildSourceIntelligenceContext(undefined)
      expect(result).toBe('')
    })

    it('returns empty string for empty object', () => {
      const result = buildSourceIntelligenceContext({})
      expect(result).toBe('')
    })
  })

  describe('features section', () => {
    it('includes detected features when present', () => {
      const intelligence: SourceIntelligence = {
        features: [
          { name: 'User Management', description: 'Handle user accounts', category: 'core' },
          { name: 'Analytics', description: 'Track metrics', category: 'advanced' },
        ],
      }

      const result = buildSourceIntelligenceContext(intelligence)

      expect(result).toContain('Detected Product Features')
      expect(result).toContain('User Management')
      expect(result).toContain('(core)')
      expect(result).toContain('Handle user accounts')
      expect(result).toContain('Analytics')
      expect(result).toContain('(advanced)')
    })

    it('handles features without category', () => {
      const intelligence: SourceIntelligence = {
        features: [
          { name: 'Simple Feature', description: 'Basic functionality' },
        ],
      }

      const result = buildSourceIntelligenceContext(intelligence)

      expect(result).toContain('Simple Feature')
      expect(result).toContain('Basic functionality')
      expect(result).not.toContain('(undefined)')
    })

    it('handles features without description', () => {
      const intelligence: SourceIntelligence = {
        features: [
          { name: 'No Description Feature' },
        ],
      }

      const result = buildSourceIntelligenceContext(intelligence)

      expect(result).toContain('No Description Feature')
      expect(result).toContain('No description')
    })

    it('limits features to top 10', () => {
      const intelligence: SourceIntelligence = {
        features: Array.from({ length: 15 }, (_, i) => ({
          name: `Feature ${i + 1}`,
          description: `Description ${i + 1}`,
        })),
      }

      const result = buildSourceIntelligenceContext(intelligence)

      expect(result).toContain('Feature 1')
      expect(result).toContain('Feature 10')
      expect(result).not.toContain('Feature 11')
      expect(result).not.toContain('Feature 15')
    })

    it('skips features section when empty array', () => {
      const intelligence: SourceIntelligence = {
        features: [],
      }

      const result = buildSourceIntelligenceContext(intelligence)

      expect(result).not.toContain('Detected Product Features')
    })
  })

  describe('journeys section', () => {
    it('includes user journeys when present', () => {
      const intelligence: SourceIntelligence = {
        journeys: [
          { name: 'Onboarding Flow', description: 'New user signup', persona: 'new_user' },
          { name: 'Checkout Process', description: 'Complete purchase', persona: 'customer' },
        ],
      }

      const result = buildSourceIntelligenceContext(intelligence)

      expect(result).toContain('Common User Journeys')
      expect(result).toContain('Onboarding Flow')
      expect(result).toContain('(new_user)')
      expect(result).toContain('New user signup')
      expect(result).toContain('Checkout Process')
    })

    it('handles journeys without persona', () => {
      const intelligence: SourceIntelligence = {
        journeys: [
          { name: 'General Flow', description: 'Any user can do this' },
        ],
      }

      const result = buildSourceIntelligenceContext(intelligence)

      expect(result).toContain('General Flow')
      expect(result).not.toContain('(undefined)')
    })

    it('limits journeys to top 5', () => {
      const intelligence: SourceIntelligence = {
        journeys: Array.from({ length: 10 }, (_, i) => ({
          name: `Journey ${i + 1}`,
          description: `Description ${i + 1}`,
        })),
      }

      const result = buildSourceIntelligenceContext(intelligence)

      expect(result).toContain('Journey 1')
      expect(result).toContain('Journey 5')
      expect(result).not.toContain('Journey 6')
    })

    it('skips journeys section when empty array', () => {
      const intelligence: SourceIntelligence = {
        journeys: [],
      }

      const result = buildSourceIntelligenceContext(intelligence)

      expect(result).not.toContain('Common User Journeys')
    })
  })

  describe('entity maps section', () => {
    it('includes entity mappings when present', () => {
      const intelligence: SourceIntelligence = {
        entityMaps: [
          { modelName: 'User', displayName: 'Customer', purpose: 'Main user accounts' },
          { modelName: 'Order', displayName: 'Purchase', purpose: 'Customer orders' },
        ],
      }

      const result = buildSourceIntelligenceContext(intelligence)

      expect(result).toContain('Business Context for Data Models')
      expect(result).toContain('User')
      expect(result).toContain('"Customer"')
      expect(result).toContain('Main user accounts')
      expect(result).toContain('Order')
      expect(result).toContain('"Purchase"')
    })

    it('uses model name as fallback for display name', () => {
      const intelligence: SourceIntelligence = {
        entityMaps: [
          { modelName: 'Product', purpose: 'Items for sale' },
        ],
      }

      const result = buildSourceIntelligenceContext(intelligence)

      expect(result).toContain('Product')
      expect(result).toContain('"Product"')
    })

    it('uses "Core entity" as fallback for purpose', () => {
      const intelligence: SourceIntelligence = {
        entityMaps: [
          { modelName: 'Category', displayName: 'Product Category' },
        ],
      }

      const result = buildSourceIntelligenceContext(intelligence)

      expect(result).toContain('Core entity')
    })

    it('skips entity maps section when empty array', () => {
      const intelligence: SourceIntelligence = {
        entityMaps: [],
      }

      const result = buildSourceIntelligenceContext(intelligence)

      expect(result).not.toContain('Business Context for Data Models')
    })
  })

  describe('competitive advantages section', () => {
    it('includes competitive advantages when present', () => {
      const intelligence: SourceIntelligence = {
        appIdentity: {
          competitiveAdvantages: [
            'Best-in-class performance',
            'Enterprise security',
            'Easy integration',
          ],
        },
      }

      const result = buildSourceIntelligenceContext(intelligence)

      expect(result).toContain('Product Differentiators')
      expect(result).toContain('Best-in-class performance')
      expect(result).toContain('Enterprise security')
      expect(result).toContain('Easy integration')
    })

    it('skips advantages section when appIdentity exists but no advantages', () => {
      const intelligence: SourceIntelligence = {
        appIdentity: {
          name: 'Test App',
          description: 'A test app',
        },
      }

      const result = buildSourceIntelligenceContext(intelligence)

      expect(result).not.toContain('Product Differentiators')
    })

    it('skips advantages section when array is empty', () => {
      const intelligence: SourceIntelligence = {
        appIdentity: {
          competitiveAdvantages: [],
        },
      }

      const result = buildSourceIntelligenceContext(intelligence)

      expect(result).not.toContain('Product Differentiators')
    })
  })

  describe('combined sections', () => {
    it('includes all sections when all data is present', () => {
      const intelligence: SourceIntelligence = {
        appIdentity: {
          name: 'TestApp',
          description: 'A comprehensive test app',
          competitiveAdvantages: ['Fast', 'Reliable'],
        },
        features: [
          { name: 'Feature A', description: 'Does A', category: 'core' },
        ],
        journeys: [
          { name: 'User Flow', description: 'Main flow', persona: 'user' },
        ],
        entityMaps: [
          { modelName: 'Item', displayName: 'Product', purpose: 'Things to sell' },
        ],
      }

      const result = buildSourceIntelligenceContext(intelligence)

      // All sections present
      expect(result).toContain('Detected Product Features')
      expect(result).toContain('Common User Journeys')
      expect(result).toContain('Business Context for Data Models')
      expect(result).toContain('Product Differentiators')

      // Content from each section
      expect(result).toContain('Feature A')
      expect(result).toContain('User Flow')
      expect(result).toContain('Item')
      expect(result).toContain('Fast')
    })

    it('handles partial data gracefully', () => {
      const intelligence: SourceIntelligence = {
        features: [
          { name: 'Only Feature' },
        ],
        // No journeys, entityMaps, or appIdentity
      }

      const result = buildSourceIntelligenceContext(intelligence)

      expect(result).toContain('Detected Product Features')
      expect(result).toContain('Only Feature')
      expect(result).not.toContain('Common User Journeys')
      expect(result).not.toContain('Business Context')
      expect(result).not.toContain('Product Differentiators')
    })
  })

  describe('markdown formatting', () => {
    it('uses markdown bold formatting for names', () => {
      const intelligence: SourceIntelligence = {
        features: [
          { name: 'Test Feature', description: 'A feature' },
        ],
      }

      const result = buildSourceIntelligenceContext(intelligence)

      expect(result).toContain('**Test Feature**')
    })

    it('uses proper heading formatting', () => {
      const intelligence: SourceIntelligence = {
        features: [
          { name: 'Feature', description: 'Desc' },
        ],
      }

      const result = buildSourceIntelligenceContext(intelligence)

      expect(result).toContain('## Detected Product Features')
    })

    it('uses bullet points for list items', () => {
      const intelligence: SourceIntelligence = {
        appIdentity: {
          competitiveAdvantages: ['Advantage 1', 'Advantage 2'],
        },
      }

      const result = buildSourceIntelligenceContext(intelligence)

      expect(result).toContain('- Advantage 1')
      expect(result).toContain('- Advantage 2')
    })
  })
})
