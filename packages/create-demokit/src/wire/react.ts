import type { FileChange } from '../types'
import { writeFile } from '../utils/fs'
import { injectImport, wrapWithProvider, readTargetFile } from './common'
import { findFile } from '../utils/fs'
import { warn } from '../utils/logger'

/**
 * Wire DemoKit into a React SPA: find the entry file and wrap with provider.
 */
export function wireReact(dir: string, dryRun: boolean): FileChange[] {
  const changes: FileChange[] = []

  const mainPath = findFile(dir, [
    'src/main.tsx', 'src/main.jsx',
    'src/App.tsx', 'src/App.jsx',
    'src/index.tsx', 'src/index.jsx',
    'app/layout.tsx',
  ])

  if (!mainPath) {
    warn('Could not find entry file — add DemoKitProviders manually')
    changes.push({ path: 'src/main.tsx', action: 'skipped', description: 'Entry file not found' })
    return changes
  }

  const content = readTargetFile(mainPath)
  if (!content) return changes

  const importLine = `import { DemoKitProviders } from './demo/providers'`
  let updated = injectImport(content, importLine)
  updated = wrapWithProvider(updated, 'DemoKitProviders')

  if (updated !== content) {
    if (!dryRun) writeFile(mainPath, updated)
    changes.push({
      path: mainPath.replace(dir + '/', ''),
      action: dryRun ? 'skipped' : 'modified',
      description: 'Added DemoKitProviders wrapper',
    })
  }

  return changes
}
