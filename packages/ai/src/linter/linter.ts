import { z } from 'zod'
import { createLinterAgent } from '../agents/linter-agent'
import type { NarrativeSample } from './sample'

export interface LinterFinding {
  severity: 'notice' | 'warning'
  message: string
  path: string
}

const linterOutputSchema = z.object({
  findings: z
    .array(
      z.object({
        severity: z.enum(['notice', 'warning']),
        message: z.string().min(1).max(500),
        path: z.string().min(1).max(200),
      })
    )
    .max(8)
    .default([]),
})

export interface RunNarrativeLinterOptions {
  scenario: string
  sample: NarrativeSample
  /** Optional custom API key (BYOK). */
  apiKey?: string
}

/**
 * Advisory (spec §5.2.4): returns [] without an LLM call when no key is
 * configured, and [] on ANY error. Never throws, never blocks.
 */
export async function runNarrativeLinter(options: RunNarrativeLinterOptions): Promise<LinterFinding[]> {
  const { scenario, sample, apiKey } = options
  if (!apiKey && !process.env.ANTHROPIC_API_KEY) return []
  try {
    const agent = createLinterAgent({ apiKey })
    const prompt = `## Scenario\n\n${scenario}\n\n## Dataset sample\n\n${JSON.stringify(sample, null, 2)}`
    const result = await agent.generate(prompt, {
      structuredOutput: { schema: linterOutputSchema },
      providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
    })
    return linterOutputSchema.parse(result.object).findings
  } catch {
    return []
  }
}
