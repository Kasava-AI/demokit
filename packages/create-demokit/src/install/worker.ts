import { createRequire } from 'node:module'
import { existsSync, mkdirSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

// `create-demokit` itself doesn't depend on msw — it scaffolds msw *into the
// target project*. Resolution below always starts from the target project's
// directory (`projectRoot`), never from this package's own node_modules.
const require = createRequire(import.meta.url)

export interface CopyWorkerScriptResult {
  dest: string
}

/**
 * Locate msw's distributed browser worker script inside the target
 * project's own dependency tree.
 *
 * msw exposes the script via its package `exports` map as
 * `msw/mockServiceWorker.js`, so that's tried first. If a given msw release
 * doesn't expose that subpath, fall back to resolving `msw/package.json`
 * and joining the on-disk path msw ships it at (`lib/mockServiceWorker.js`
 * as of msw 2.x — verified against this repo's installed msw@2.15.0).
 */
function resolveWorkerScriptSource(projectRoot: string): string {
  try {
    return require.resolve('msw/mockServiceWorker.js', { paths: [projectRoot] })
  } catch {
    // Fall through to the package.json + lib/ fallback below.
  }

  let pkgJsonPath: string
  try {
    pkgJsonPath = require.resolve('msw/package.json', { paths: [projectRoot] })
  } catch {
    throw new Error(
      'msw is not installed in this project — run `pnpm add -D msw` (or npm/yarn equivalent) ' +
        'and re-run create-demokit.'
    )
  }

  const fallback = join(dirname(pkgJsonPath), 'lib', 'mockServiceWorker.js')
  if (existsSync(fallback)) {
    return fallback
  }

  throw new Error(
    `Could not locate msw's mockServiceWorker.js (checked ${fallback}). Its distribution layout ` +
      'may have changed — copy the worker file manually, see https://mswjs.io/docs/cli/init.'
  )
}

/**
 * Copies msw's mockServiceWorker.js into `<projectRoot>/public/` so the
 * browser can register it as a Service Worker (creating `public/` if it
 * doesn't exist yet). Always overwrites any existing copy — re-run after
 * upgrading msw to pick up worker changes.
 */
export async function copyWorkerScript(projectRoot: string): Promise<CopyWorkerScriptResult> {
  const source = resolveWorkerScriptSource(projectRoot)

  const publicDir = join(projectRoot, 'public')
  mkdirSync(publicDir, { recursive: true })

  const dest = join(publicDir, 'mockServiceWorker.js')
  copyFileSync(source, dest)

  return { dest }
}
