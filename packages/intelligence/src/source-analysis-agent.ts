/**
 * Source Analysis Agent
 *
 * Mastra agent that analyzes individual data sources (website, help center, etc.)
 * and extracts structured insights like product name, target audience,
 * value propositions, and mentioned features.
 *
 * @module
 */

import { Agent } from '@mastra/core/agent'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

// ============================================================================
// Source Analysis Schema
// ============================================================================

/**
 * Schema for source analysis result (stored in extractedContent)
 */
export const SourceAnalysisSchema = z.object({
  productName: z.string().nullable().describe('Product or app name identified'),
  companyName: z.string().nullable().describe('Company or organization name'),
  targetAudience: z.array(z.string()).describe('Target user segments'),
  valuePropositions: z.array(z.string()).describe('Key value propositions'),
  mentionedFeatures: z.array(z.string()).describe('Features mentioned in this source'),
  summary: z.string().describe('Brief summary of what this source tells us'),
  keyInsights: z.array(z.string()).describe('Key insights extracted'),
  confidence: z.number().min(0).max(1).describe('Confidence in the analysis'),
  analyzedAt: z.string().describe('ISO timestamp of when analysis was performed'),
})

export type SourceAnalysis = z.infer<typeof SourceAnalysisSchema>

/**
 * Input for source analysis
 */
export interface SourceAnalysisInput {
  type: 'website' | 'help_center' | 'readme' | 'documentation'
  url?: string | null
  content: string
}

// ============================================================================
// Agent Factory
// ============================================================================

/**
 * Create a source analysis agent
 *
 * This agent analyzes a single source and extracts:
 * - Product/company identity
 * - Target audience
 * - Value propositions
 * - Mentioned features
 * - Key insights
 */
export function createSourceAnalysisAgent(): Agent {
  return new Agent({
    id: 'demokit-source-analyzer',
    name: 'DemoKit Source Analyzer',
    instructions: `You are an expert at extracting product intelligence from web content.

Your job is to analyze a single source (website, help center, README, or documentation)
and extract structured information about the product.

## What to Extract

1. **Product Identity**
   - Product/app name (if identifiable)
   - Company/organization name

2. **Target Audience**
   - Who is this product for?
   - What types of users or businesses?
   - Examples: "Small business owners", "Enterprise IT teams", "Developers"

3. **Value Propositions**
   - What problems does it solve?
   - What benefits does it provide?
   - Keep these concise and clear

4. **Features Mentioned**
   - List specific features or capabilities mentioned
   - Use consistent naming (kebab-case friendly)
   - Examples: "User authentication", "Real-time analytics", "API integrations"

5. **Key Insights**
   - Important things the AI should know about this product
   - Industry context, use cases, differentiators
   - Things that would help generate better demo data

6. **Summary**
   - 2-3 sentence overview of what this source tells us

## Tips
- Focus on extractable, actionable information
- Be specific - "sales teams" is better than "business users"
- For features, look for action verbs and capability descriptions
- Confidence should reflect how much useful info you found (0.3 for sparse, 0.9 for rich)

Provide your analysis in the structured format.`,
    model: anthropic('claude-sonnet-4-20250514'),
  })
}

// ============================================================================
// Analysis Function
// ============================================================================

/**
 * Analyze a single source and extract structured insights
 */
export async function analyzeSource(input: SourceAnalysisInput): Promise<SourceAnalysis> {
  const agent = createSourceAnalysisAgent()

  const sourceTypeLabel = {
    website: 'Website',
    help_center: 'Help Center',
    readme: 'README',
    documentation: 'Documentation',
  }[input.type]

  // Truncate content if too long
  const maxContentLength = 15000
  const content = input.content.length > maxContentLength
    ? input.content.slice(0, maxContentLength) + '\n\n[Content truncated...]'
    : input.content

  const prompt = `Analyze this ${sourceTypeLabel} content and extract product intelligence.

${input.url ? `Source URL: ${input.url}\n\n` : ''}## Content

${content}

Extract all available information about the product, its features, target audience, and value propositions.
Be thorough but focus on information that would help create realistic demo data.`

  const result = await agent.generate(prompt, {
    structuredOutput: { schema: SourceAnalysisSchema.omit({ analyzedAt: true }) },
  })

  const analysis = result.object as Omit<SourceAnalysis, 'analyzedAt'>

  return {
    ...analysis,
    analyzedAt: new Date().toISOString(),
  }
}

/**
 * Check if a source has been analyzed
 */
export function hasSourceAnalysis(extractedContent: Record<string, unknown> | null): boolean {
  if (!extractedContent) return false
  return (
    'analyzedAt' in extractedContent &&
    'summary' in extractedContent &&
    typeof extractedContent.summary === 'string'
  )
}

/**
 * Parse source analysis from extractedContent
 */
export function parseSourceAnalysis(extractedContent: Record<string, unknown> | null): SourceAnalysis | null {
  if (!extractedContent || !hasSourceAnalysis(extractedContent)) {
    return null
  }

  try {
    return SourceAnalysisSchema.parse(extractedContent)
  } catch {
    return null
  }
}
