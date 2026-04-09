import * as p from '@clack/prompts'
import pc from 'picocolors'
import type { CliResult, Framework } from '../types'
import { FRAMEWORK_LABELS } from '../detect/framework'

export function printSummary(result: CliResult, cloud: boolean) {
  const label = FRAMEWORK_LABELS[result.framework]

  const lines: string[] = []

  if (result.packagesInstalled.length > 0) {
    lines.push(pc.dim('Packages installed:'))
    for (const pkg of result.packagesInstalled) {
      lines.push(`  ${pc.green('+')} ${pkg}`)
    }
    lines.push('')
  }

  if (result.filesChanged.length > 0) {
    lines.push(pc.dim('Files:'))
    for (const file of result.filesChanged) {
      const icon = file.action === 'created' ? pc.green('+')
        : file.action === 'modified' ? pc.yellow('~')
        : pc.dim('-')
      const actionLabel = file.action === 'skipped' ? pc.dim('(skipped)') : ''
      lines.push(`  ${icon} ${file.path} ${actionLabel}`)
    }
    lines.push('')
  }

  if (result.endpointsDetected > 0) {
    lines.push(`${pc.dim('Endpoints detected:')} ${result.endpointsDetected}`)
  }

  lines.push(`${pc.dim('Framework:')} ${label}`)

  p.note(lines.join('\n'), 'DemoKit Setup Complete')

  const nextSteps = [
    `Visit any page with ${pc.cyan('?demo=true')} to activate demo mode`,
    `Edit your fixtures file to customize demo data`,
  ]

  if (cloud) {
    nextSteps.push(`Set your API key in ${pc.cyan('.env.local')}`)
  }

  p.note(nextSteps.map((s, i) => `${i + 1}. ${s}`).join('\n'), 'Next steps')
}
