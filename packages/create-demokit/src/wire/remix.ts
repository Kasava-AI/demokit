import { join } from 'node:path'
import type { FileChange } from '../types'
import { writeFile } from '../utils/fs'
import { injectImport, wrapWithProvider, readTargetFile } from './common'
import { warn } from '../utils/logger'

export function wireRemix(dir: string, dryRun: boolean): FileChange[] {
  const changes: FileChange[] = []
  const rootPath = join(dir, 'app', 'root.tsx')
  const content = readTargetFile(rootPath)

  if (!content) {
    warn('Could not find app/root.tsx — add DemoKitProviders manually')
    changes.push({ path: 'app/root.tsx', action: 'skipped', description: 'Root file not found' })
    return changes
  }

  const importLine = `import { DemoKitProviders } from './demo/providers'`
  let updated = injectImport(content, importLine)

  // Try to wrap <Outlet /> with the provider
  if (updated.includes('<Outlet') && !updated.includes('DemoKitProviders')) {
    updated = updated.replace(
      /(<Outlet\s*\/>)/,
      '<DemoKitProviders>\n            $1\n          </DemoKitProviders>'
    )
  } else {
    updated = wrapWithProvider(updated, 'DemoKitProviders')
  }

  if (updated !== content) {
    if (!dryRun) writeFile(rootPath, updated)
    changes.push({
      path: 'app/root.tsx',
      action: dryRun ? 'skipped' : 'modified',
      description: 'Added DemoKitProviders wrapper',
    })
  }

  return changes
}
