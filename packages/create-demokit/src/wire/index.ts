import type { Framework, FileChange } from '../types'
import { wireNext } from './next'
import { wireRemix } from './remix'
import { wireReactRouter } from './react-router'
import { wireReact } from './react'

/**
 * Wire the DemoKit provider into the project's entry point.
 */
export function wireProvider(dir: string, framework: Framework, dryRun: boolean): FileChange[] {
  switch (framework) {
    case 'next':
      return wireNext(dir, dryRun)
    case 'remix':
      return wireRemix(dir, dryRun)
    case 'react-router':
      return wireReactRouter(dir, dryRun)
    // These all use the same wiring pattern
    case 'tanstack-query':
    case 'swr':
    case 'trpc':
    case 'react':
      return wireReact(dir, dryRun)
  }
}
