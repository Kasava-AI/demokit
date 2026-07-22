import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { copyWorkerScript } from '../install/worker'

const WORKER_CONTENT_V1 = '/* mock service worker v1 */\nself.addEventListener("install", () => {})\n'
const WORKER_CONTENT_V2 = '/* mock service worker v2 (upgraded) */\nself.addEventListener("install", () => {})\n'

/**
 * Builds a fake `node_modules/msw` inside `root`, mirroring the on-disk
 * layout of the real package (verified against this repo's installed
 * msw@2.15.0: the worker script lives at `lib/mockServiceWorker.js` and is
 * exposed via the package's `exports` map under `./mockServiceWorker.js`).
 *
 * `exposeWorkerExport: false` simulates an msw release whose export map
 * doesn't expose the worker subpath, forcing the package.json + lib/ fallback.
 */
function createFakeMswPackage(
  root: string,
  opts: { exposeWorkerExport?: boolean; blockAllExports?: boolean; content?: string } = {}
) {
  const { exposeWorkerExport = true, blockAllExports = false, content = WORKER_CONTENT_V1 } = opts
  const mswDir = join(root, 'node_modules', 'msw')
  const libDir = join(mswDir, 'lib')
  mkdirSync(libDir, { recursive: true })

  let exports: Record<string, string> = {
    '.': './lib/index.js',
    './package.json': './package.json',
  }
  if (exposeWorkerExport) {
    exports['./mockServiceWorker.js'] = './lib/mockServiceWorker.js'
  }
  if (blockAllExports) {
    // An "exports" map that exposes nothing at all (not even ./package.json)
    // — Node's package-exports encapsulation rejects every subpath outright.
    exports = {}
  }

  writeFileSync(
    join(mswDir, 'package.json'),
    JSON.stringify({ name: 'msw', version: '2.15.0', main: './lib/index.js', exports }, null, 2)
  )
  writeFileSync(join(libDir, 'index.js'), 'module.exports = {}\n')
  writeFileSync(join(libDir, 'mockServiceWorker.js'), content)
}

let projectRoot: string

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), 'create-demokit-worker-'))
})

afterEach(() => {
  rmSync(projectRoot, { recursive: true, force: true })
})

describe('copyWorkerScript', () => {
  it('copies mockServiceWorker.js to public/, preserving content', async () => {
    createFakeMswPackage(projectRoot)

    const result = await copyWorkerScript(projectRoot)

    const expectedDest = join(projectRoot, 'public', 'mockServiceWorker.js')
    expect(result.dest).toBe(expectedDest)
    expect(existsSync(expectedDest)).toBe(true)
    expect(readFileSync(expectedDest, 'utf-8')).toBe(WORKER_CONTENT_V1)
  })

  it('creates public/ if it does not exist', async () => {
    createFakeMswPackage(projectRoot)
    expect(existsSync(join(projectRoot, 'public'))).toBe(false)

    await copyWorkerScript(projectRoot)

    expect(existsSync(join(projectRoot, 'public'))).toBe(true)
  })

  it('overwrites an existing stale copy on a second run', async () => {
    createFakeMswPackage(projectRoot, { content: WORKER_CONTENT_V1 })
    const first = await copyWorkerScript(projectRoot)
    expect(readFileSync(first.dest, 'utf-8')).toBe(WORKER_CONTENT_V1)

    // Simulate an msw upgrade that changed the worker script.
    writeFileSync(join(projectRoot, 'node_modules', 'msw', 'lib', 'mockServiceWorker.js'), WORKER_CONTENT_V2)

    const second = await copyWorkerScript(projectRoot)

    expect(second.dest).toBe(first.dest)
    expect(readFileSync(second.dest, 'utf-8')).toBe(WORKER_CONTENT_V2)
  })

  it('falls back to msw/package.json + lib/mockServiceWorker.js when the export map hides the worker subpath', async () => {
    createFakeMswPackage(projectRoot, { exposeWorkerExport: false, content: WORKER_CONTENT_V1 })

    const result = await copyWorkerScript(projectRoot)

    expect(readFileSync(result.dest, 'utf-8')).toBe(WORKER_CONTENT_V1)
  })

  it('throws a clear error when msw is not resolvable in the project', async () => {
    // Node's package-exports encapsulation blocks every subpath (including
    // ./package.json) here, so both the primary resolve and the fallback
    // fail — this is what "msw isn't really installed for this project"
    // looks like at the require.resolve layer. (A literal absence of
    // node_modules/msw isn't used here: this suite runs inside the DemoKit
    // monorepo, where msw is a real dependency of a sibling package, and
    // Node's ancestor-directory walk for an *absent* package can still
    // bubble up and find it — exports-blocking pins the failure to this
    // project's own package.json instead of depending on directory walking.)
    createFakeMswPackage(projectRoot, { blockAllExports: true })

    await expect(copyWorkerScript(projectRoot)).rejects.toThrow(
      /msw is not installed.*pnpm add -D msw.*re-run create-demokit/i
    )
  })
})
