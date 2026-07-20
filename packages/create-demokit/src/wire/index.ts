import type { Framework, FileChange } from '../types'
import { wireReact } from './react'

/**
 * Wire the DemoKit provider into the project's entry point.
 */
export function wireProvider(dir: string, framework: Framework, dryRun: boolean): FileChange[] {
  switch (framework) {
    case 'react':
      return wireReact(dir, dryRun)
  }
}
