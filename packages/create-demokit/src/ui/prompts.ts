import * as p from '@clack/prompts'
import type { DetectedEndpoint } from '../types'

/**
 * Confirm detected endpoints before generating fixtures.
 */
export async function confirmEndpoints(endpoints: DetectedEndpoint[]): Promise<boolean> {
  if (endpoints.length === 0) {
    p.note(
      'No API endpoints were detected.\nAn empty fixtures file will be created for you to fill in.',
      'No endpoints found'
    )
    return true
  }

  const list = endpoints
    .map((ep) => `  ${ep.method.padEnd(7)} ${ep.path}`)
    .join('\n')

  p.note(list, `Found ${endpoints.length} endpoint${endpoints.length === 1 ? '' : 's'}`)

  const confirmed = await p.confirm({
    message: 'Generate fixtures for these endpoints?',
    initialValue: true,
  })

  if (p.isCancel(confirmed)) process.exit(0)
  return confirmed
}

/**
 * Ask about file conflicts.
 */
export async function confirmOverwrite(filePath: string): Promise<boolean> {
  const result = await p.confirm({
    message: `${filePath} already exists. Overwrite?`,
    initialValue: false,
  })

  if (p.isCancel(result)) process.exit(0)
  return result
}
