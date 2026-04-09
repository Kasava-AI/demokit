import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { PackageManager } from '../types'

export function detectPackageManager(dir: string): PackageManager {
  if (existsSync(join(dir, 'pnpm-lock.yaml'))) return 'pnpm'
  if (existsSync(join(dir, 'bun.lockb')) || existsSync(join(dir, 'bun.lock'))) return 'bun'
  if (existsSync(join(dir, 'yarn.lock'))) return 'yarn'
  return 'npm'
}

export function installCommand(pm: PackageManager, packages: string[]): string {
  const pkgs = packages.join(' ')
  switch (pm) {
    case 'pnpm':
      return `pnpm add ${pkgs}`
    case 'yarn':
      return `yarn add ${pkgs}`
    case 'bun':
      return `bun add ${pkgs}`
    case 'npm':
      return `npm install ${pkgs}`
  }
}
