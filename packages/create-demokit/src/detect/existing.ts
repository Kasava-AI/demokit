import { join } from 'node:path'
import type { ExistingInstallation, Framework } from '../types'
import { readJson } from '../utils/fs'
import { getRequiredPackages } from '../install/packages'

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

const DEMOKIT_SCOPE = '@demokit-ai/'

export function checkExistingInstallation(dir: string, framework: Framework): ExistingInstallation {
  const pkg = readJson<PackageJson>(join(dir, 'package.json'))
  if (!pkg) {
    return { packages: [], hasCore: false, hasAdapter: false, isComplete: false }
  }

  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
  const demokitPackages = Object.keys(allDeps).filter((d) => d.startsWith(DEMOKIT_SCOPE))

  const hasCore = demokitPackages.includes('@demokit-ai/core')
  const required = getRequiredPackages(framework)
  const hasAdapter = required.every((p) => demokitPackages.includes(p))

  return {
    packages: demokitPackages,
    hasCore,
    hasAdapter,
    isComplete: hasCore && hasAdapter,
  }
}
