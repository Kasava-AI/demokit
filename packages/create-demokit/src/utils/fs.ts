import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

export function fileExists(path: string): boolean {
  return existsSync(path)
}

export function readFile(path: string): string | null {
  try {
    return readFileSync(path, 'utf-8')
  } catch {
    return null
  }
}

export function readJson<T = unknown>(path: string): T | null {
  const content = readFile(path)
  if (!content) return null
  try {
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

export function writeFile(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content, 'utf-8')
}

/**
 * Find first existing file from a list of candidates relative to a base dir.
 */
export function findFile(baseDir: string, candidates: string[]): string | null {
  for (const candidate of candidates) {
    const full = join(baseDir, candidate)
    if (existsSync(full)) return full
  }
  return null
}
