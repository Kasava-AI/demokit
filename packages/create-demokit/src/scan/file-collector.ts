import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, extname } from 'node:path'
import type { CodebaseFile } from '@demokit-ai/core'
import { verbose } from '../utils/logger'

const IGNORE_DIRS = new Set([
  'node_modules', '.next', '.remix', '.cache', 'dist', 'build',
  '.git', '.turbo', 'coverage', '.vercel', '.output',
])

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.prisma', '.graphql', '.gql'])

/**
 * Collect relevant source files from a project directory.
 * Filters to code files and respects common ignore patterns.
 */
export function collectFiles(dir: string, maxFiles = 500): CodebaseFile[] {
  const files: CodebaseFile[] = []

  function walk(currentDir: string, depth: number) {
    if (depth > 8 || files.length >= maxFiles) return

    let entries: string[]
    try {
      entries = readdirSync(currentDir)
    } catch {
      return
    }

    for (const entry of entries) {
      if (files.length >= maxFiles) break
      if (entry.startsWith('.') && entry !== '.prisma') continue
      if (IGNORE_DIRS.has(entry)) continue

      const fullPath = join(currentDir, entry)

      let stat
      try {
        stat = statSync(fullPath)
      } catch {
        continue
      }

      if (stat.isDirectory()) {
        walk(fullPath, depth + 1)
      } else if (stat.isFile() && CODE_EXTENSIONS.has(extname(entry))) {
        try {
          const content = readFileSync(fullPath, 'utf-8')
          files.push({
            path: relative(dir, fullPath),
            content,
          })
        } catch {
          // Skip unreadable files
        }
      }
    }
  }

  walk(dir, 0)
  verbose(`Collected ${files.length} source files`)
  return files
}

/**
 * Collect only files matching specific path patterns.
 * Used for targeted scanning (e.g., only API routes).
 */
export function collectFilesMatching(
  dir: string,
  patterns: string[]
): CodebaseFile[] {
  const allFiles = collectFiles(dir)
  return allFiles.filter((f) =>
    patterns.some((pattern) => matchGlobSimple(f.path, pattern))
  )
}

/**
 * Simple glob matching for path patterns.
 * Supports ** (any directory depth) and * (any segment).
 */
function matchGlobSimple(filePath: string, pattern: string): boolean {
  const regex = pattern
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*')
  return new RegExp(`^${regex}$`).test(filePath)
}
