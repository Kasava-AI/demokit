import { execSync } from 'node:child_process'
import type { PackageManager } from '../types'
import { installCommand } from '../utils/package-manager'
import { verbose, error } from '../utils/logger'

export function installPackages(
  pm: PackageManager,
  packages: string[],
  dir: string
): boolean {
  const cmd = installCommand(pm, packages)
  verbose(`Running: ${cmd}`)

  try {
    execSync(cmd, {
      cwd: dir,
      stdio: 'pipe',
      timeout: 120_000,
    })
    return true
  } catch (err) {
    error(`Installation failed: ${cmd}`)
    if (err instanceof Error && 'stderr' in err) {
      error(String((err as { stderr: unknown }).stderr).slice(0, 500))
    }
    error(`Try running manually: ${cmd}`)
    return false
  }
}
