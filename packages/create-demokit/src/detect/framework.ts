import { join } from 'node:path'
import { existsSync } from 'node:fs'
import type { Framework, DetectionResult } from '../types'
import { readJson } from '../utils/fs'

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

/**
 * Framework detection rules in priority order.
 * First match wins — more specific frameworks checked before generic ones.
 */
const DETECTION_RULES: Array<{
  framework: Framework
  deps: string[]
  label: string
}> = [
  { framework: 'trpc', deps: ['@trpc/client', '@trpc/react-query', '@trpc/server'], label: 'tRPC' },
  { framework: 'next', deps: ['next'], label: 'Next.js' },
  { framework: 'remix', deps: ['@remix-run/react', '@remix-run/node'], label: 'Remix' },
  { framework: 'react-router', deps: ['react-router'], label: 'React Router' },
  { framework: 'tanstack-query', deps: ['@tanstack/react-query'], label: 'TanStack Query' },
  { framework: 'swr', deps: ['swr'], label: 'SWR' },
  { framework: 'react', deps: ['react'], label: 'React' },
]

export const FRAMEWORK_LABELS: Record<Framework, string> = {
  next: 'Next.js',
  remix: 'Remix',
  'react-router': 'React Router v7',
  'tanstack-query': 'TanStack Query',
  swr: 'SWR',
  trpc: 'tRPC',
  react: 'React',
}

export function detectFramework(dir: string): DetectionResult {
  const pkg = readJson<PackageJson>(join(dir, 'package.json'))
  if (!pkg) {
    return { framework: 'react', confidence: 'low', evidence: ['No package.json found'] }
  }

  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
  const evidence: string[] = []

  for (const rule of DETECTION_RULES) {
    const found = rule.deps.filter((d) => d in allDeps)
    if (found.length > 0) {
      evidence.push(...found.map((d) => `Found "${d}" in dependencies`))

      // Extra confidence check for react-router v7+
      if (rule.framework === 'react-router') {
        const version = allDeps['react-router'] ?? ''
        if (!version.match(/^[\^~]?[7-9]/)) {
          continue // Skip if not v7+
        }
        evidence.push(`react-router version: ${version}`)
      }

      // Verify directory structure for extra confidence
      const dirCheck = verifyStructure(dir, rule.framework)
      if (dirCheck) evidence.push(dirCheck)

      return {
        framework: rule.framework,
        confidence: found.length > 1 || dirCheck ? 'high' : 'medium',
        evidence,
      }
    }
  }

  return { framework: 'react', confidence: 'low', evidence: ['No framework detected, defaulting to React'] }
}

function verifyStructure(dir: string, framework: Framework): string | null {
  switch (framework) {
    case 'next':
      if (existsSync(join(dir, 'app'))) return 'Found app/ directory (App Router)'
      if (existsSync(join(dir, 'pages'))) return 'Found pages/ directory (Pages Router)'
      return null
    case 'remix':
      if (existsSync(join(dir, 'app', 'root.tsx'))) return 'Found app/root.tsx'
      return null
    case 'react-router':
      if (existsSync(join(dir, 'app', 'routes'))) return 'Found app/routes/ directory'
      return null
    default:
      return null
  }
}

/**
 * Detect if this is a Next.js App Router or Pages Router project.
 */
export function detectNextRouterType(dir: string): 'app' | 'pages' {
  if (existsSync(join(dir, 'app'))) return 'app'
  return 'pages'
}
