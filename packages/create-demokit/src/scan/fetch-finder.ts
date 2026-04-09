import type { CodebaseFile } from '@demokit-ai/core'
import type { DetectedEndpoint } from '../types'
import { verbose } from '../utils/logger'

/**
 * Patterns to extract API URLs from client-side code.
 * Each pattern has a regex and default HTTP method.
 */
const FETCH_PATTERNS: Array<{ regex: RegExp; method: string }> = [
  // fetch('/api/...') or fetch("/api/...")
  { regex: /fetch\(\s*['"`](\/api\/[^'"`\s]+)['"`]/g, method: 'GET' },
  // fetch('https://...' or 'http://...')
  { regex: /fetch\(\s*['"`](https?:\/\/[^'"`\s]+)['"`]/g, method: 'GET' },
  // useSWR('/api/...') and useDemoSWR('/api/...')
  { regex: /use(?:Demo)?SWR\w*\(\s*['"`](\/[^'"`\s]+)['"`]/g, method: 'GET' },
  // useDemoSWRMutation('/api/...')
  { regex: /use(?:Demo)?SWRMutation\w*[\s\S]*?['"`](\/[^'"`\s]+)['"`]/g, method: 'POST' },
  // useQuery({ queryKey: ['/api/...']
  { regex: /queryKey\s*:\s*\[['"`](\/[^'"`\s]+)['"`]/g, method: 'GET' },
  // useDemoQuery / useQuery with URL string
  { regex: /use(?:Demo)?Query\w*\(\s*['"`](\/[^'"`\s]+)['"`]/g, method: 'GET' },
  // axios.get('/api/...')
  { regex: /axios\.get\(\s*['"`](\/[^'"`\s]+)['"`]/g, method: 'GET' },
  // axios.post('/api/...')
  { regex: /axios\.post\(\s*['"`](\/[^'"`\s]+)['"`]/g, method: 'POST' },
  // fetch with method: 'POST'
  { regex: /fetch\(\s*['"`](\/[^'"`\s]+)['"`]\s*,\s*\{[^}]*method\s*:\s*['"`]POST['"`]/gs, method: 'POST' },
  { regex: /fetch\(\s*['"`](\/[^'"`\s]+)['"`]\s*,\s*\{[^}]*method\s*:\s*['"`]PUT['"`]/gs, method: 'PUT' },
  { regex: /fetch\(\s*['"`](\/[^'"`\s]+)['"`]\s*,\s*\{[^}]*method\s*:\s*['"`]DELETE['"`]/gs, method: 'DELETE' },
  // Template literal URLs: fetch(`/api/products/${id}`)
  { regex: /fetch\(\s*`(\/api\/[^`]+)`/g, method: 'GET' },
  // useDemoSWR with template literal
  { regex: /use(?:Demo)?SWR\w*\(\s*`(\/[^`]+)`/g, method: 'GET' },
]

/**
 * Scan files for fetch/API call patterns and extract endpoints.
 */
export function findFetchCalls(files: CodebaseFile[]): DetectedEndpoint[] {
  const seen = new Set<string>()
  const endpoints: DetectedEndpoint[] = []

  for (const file of files) {
    // Skip test files, config files, fixture files
    if (file.path.includes('.test.') || file.path.includes('.spec.')) continue
    if (file.path.includes('fixture') || file.path.includes('mock')) continue

    for (const { regex, method } of FETCH_PATTERNS) {
      // Reset regex state
      regex.lastIndex = 0
      let match: RegExpExecArray | null

      while ((match = regex.exec(file.content)) !== null) {
        const url = match[1]
        if (!url) continue

        // Normalize: replace dynamic segments with :param
        const normalized = normalizeUrl(url)
        const key = `${method} ${normalized}`

        if (!seen.has(key)) {
          seen.add(key)
          endpoints.push({
            method,
            path: normalized,
            source: 'fetch-call',
          })
        }
      }
    }
  }

  verbose(`Found ${endpoints.length} endpoints from fetch calls`)
  return endpoints
}

/**
 * Normalize a URL by replacing dynamic segments with :param placeholders.
 * /api/users/123 → /api/users/:id
 * /api/orders/abc-def/items → /api/orders/:id/items
 */
function normalizeUrl(url: string): string {
  // Remove query string
  const path = url.split('?')[0]!

  // Remove base URL if present
  const apiPath = path.replace(/^https?:\/\/[^/]+/, '')

  return apiPath
    .replace(/\$\{[^}]+\}/g, ':id')  // Template literals: ${id} → :id
    .replace(/\/[0-9a-f-]{8,}/gi, '/:id')
    .replace(/\/\d+/g, '/:id')
}
