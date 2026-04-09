import { readFile } from '../utils/fs'
import { verbose, warn } from '../utils/logger'

/**
 * Inject an import statement at the top of a file (after 'use client' if present).
 */
export function injectImport(content: string, importLine: string): string {
  // Don't add if already present
  if (content.includes(importLine)) return content

  // Insert after 'use client' directive if present
  const useClientMatch = content.match(/^(['"])use client\1[;\n]*/m)
  if (useClientMatch) {
    const insertPos = useClientMatch.index! + useClientMatch[0].length
    return content.slice(0, insertPos) + '\n' + importLine + '\n' + content.slice(insertPos)
  }

  return importLine + '\n' + content
}

/**
 * Wrap JSX children with a provider component.
 *
 * Looks for the pattern: {children} and wraps it with <Provider>{children}</Provider>
 * Or looks for a known wrapper pattern and inserts around it.
 */
export function wrapWithProvider(
  content: string,
  componentName: string,
): string {
  // Already wrapped?
  if (content.includes(componentName)) return content

  // Strategy 1: Find {children} in JSX and wrap it
  const childrenPattern = /(\s*)\{children\}/
  const childrenMatch = content.match(childrenPattern)
  if (childrenMatch) {
    const indent = childrenMatch[1] || '        '
    const wrapped = `${indent}<${componentName}>\n${indent}  {children}\n${indent}</${componentName}>`
    return content.replace(childrenPattern, wrapped)
  }

  // Strategy 2: Couldn't find pattern to wrap
  warn(`Could not auto-wrap with <${componentName}>. Add it manually to your layout.`)
  return content
}

/**
 * Read a file and return its content, or null with a warning.
 */
export function readTargetFile(path: string): string | null {
  const content = readFile(path)
  if (!content) {
    verbose(`File not found: ${path}`)
    return null
  }
  return content
}
