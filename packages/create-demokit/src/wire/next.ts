import { join } from 'node:path'
import type { FileChange } from '../types'
import { fileExists, writeFile } from '../utils/fs'
import { injectImport, wrapWithProvider, readTargetFile } from './common'
import { getProviderPath } from '../generate/provider'
import { warn } from '../utils/logger'

/**
 * Wire DemoKit into a Next.js App Router project.
 *
 * 1. Add import + wrap children in app/layout.tsx
 */
export function wireNext(dir: string, dryRun: boolean): FileChange[] {
  const changes: FileChange[] = []

  // Find the layout file
  const layoutCandidates = [
    'app/layout.tsx',
    'app/layout.jsx',
    'src/app/layout.tsx',
    'src/app/layout.jsx',
  ]

  let layoutPath: string | null = null
  for (const candidate of layoutCandidates) {
    const full = join(dir, candidate)
    if (fileExists(full)) {
      layoutPath = full
      break
    }
  }

  if (!layoutPath) {
    warn('Could not find app/layout.tsx — add DemoKitProviders manually')
    changes.push({ path: 'app/layout.tsx', action: 'skipped', description: 'Layout file not found' })
    return changes
  }

  const content = readTargetFile(layoutPath)
  if (!content) return changes

  const providerRelPath = getProviderPath('next').replace(/\.tsx$/, '')
  const importLine = `import { DemoKitProviders } from './${providerRelPath.replace(/^app\//, '')}'`

  let updated = injectImport(content, importLine)
  updated = wrapWithProvider(updated, 'DemoKitProviders')

  if (updated !== content) {
    if (!dryRun) writeFile(layoutPath, updated)
    changes.push({
      path: layoutPath.replace(dir + '/', ''),
      action: dryRun ? 'skipped' : 'modified',
      description: 'Added DemoKitProviders wrapper',
    })
  }

  return changes
}
