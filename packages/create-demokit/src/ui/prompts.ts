import * as p from '@clack/prompts'
import type { Framework, DetectedEndpoint } from '../types'
import { FRAMEWORK_LABELS } from '../detect/framework'

/**
 * Confirm or override the detected framework.
 */
export async function confirmFramework(detected: Framework): Promise<Framework> {
  const label = FRAMEWORK_LABELS[detected]

  const confirmed = await p.confirm({
    message: `Detected framework: ${label}. Is this correct?`,
    initialValue: true,
  })

  if (p.isCancel(confirmed)) process.exit(0)

  if (confirmed) return detected

  const selected = await p.select({
    message: 'Select your framework:',
    options: Object.entries(FRAMEWORK_LABELS).map(([value, label]) => ({
      value: value as Framework,
      label,
    })),
  })

  if (p.isCancel(selected)) process.exit(0)
  return selected
}

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
