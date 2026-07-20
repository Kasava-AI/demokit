import type { Framework } from '../types'

const FRAMEWORK_PACKAGES: Record<Framework, string[]> = {
  react: ['@demokit-ai/core', '@demokit-ai/react'],
}

export function getRequiredPackages(framework: Framework, cloud = false): string[] {
  const packages = [...FRAMEWORK_PACKAGES[framework]]
  if (cloud) {
    packages.push('@demokit-ai/ai')
  }
  return packages
}

/**
 * Given already-installed packages, return only the missing ones.
 */
export function getMissingPackages(required: string[], installed: string[]): string[] {
  return required.filter((p) => !installed.includes(p))
}
