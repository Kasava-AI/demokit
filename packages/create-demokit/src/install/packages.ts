import type { Framework, Transport } from '../types'

const FRAMEWORK_PACKAGES: Record<Framework, string[]> = {
  react: ['@demokit-ai/core', '@demokit-ai/react'],
}

/**
 * `transport` defaults to `'fetch'` here — matching `@demokit-ai/react`'s own
 * default — so callers that don't care about transport (e.g. the existing-
 * installation check) see the same required set as before msw scaffolding
 * existed. The CLI's own default for *new* scaffolds is `'msw'` (see
 * `index.ts` `parseArgs`), and it always passes `options.transport` explicitly.
 */
export function getRequiredPackages(framework: Framework, cloud = false, transport: Transport = 'fetch'): string[] {
  const packages = [...FRAMEWORK_PACKAGES[framework]]
  if (cloud) {
    packages.push('@demokit-ai/ai')
  }
  if (transport === 'msw') {
    packages.push('@demokit-ai/msw-transport', 'msw')
  }
  return packages
}

/**
 * Given already-installed packages, return only the missing ones.
 */
export function getMissingPackages(required: string[], installed: string[]): string[] {
  return required.filter((p) => !installed.includes(p))
}
