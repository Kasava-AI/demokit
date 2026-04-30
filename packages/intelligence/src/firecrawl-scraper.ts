/**
 * Firecrawl Web Scraper
 *
 * Happy path for scraping. Uses Firecrawl for:
 * - JavaScript rendering (`waitFor`)
 * - Clean main-content markdown (`onlyMainContent`)
 * - Sitemap-aware page discovery (`/v1/map`)
 * - Help-center crawling with built-in polling (`/v1/crawl`)
 *
 * Falls back to fetch + cheerio (./web-scraper) when:
 * - No API key is configured
 * - Firecrawl returns empty content
 * - Any Firecrawl call throws
 *
 * @module
 */

import FirecrawlApp from '@mendable/firecrawl-js'
import type { IntelligenceSource } from './types'
import {
  scrapeUrl,
  scrapeWebsite,
  scrapeHelpCenter,
  classifyUrl,
  priorityFor,
  combinePages,
  type ScrapeResult,
  type ScrapeOptions,
} from './web-scraper'

// ============================================================================
// Types
// ============================================================================

/** Valid Firecrawl output formats */
type FirecrawlFormat = 'markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot'

/**
 * Firecrawl-specific scrape options
 */
export interface FirecrawlScrapeOptions extends ScrapeOptions {
  /** Firecrawl API key (defaults to FIRECRAWL_API_KEY env var) */
  apiKey?: string
  /** Formats to extract (defaults to ['markdown']) */
  formats?: FirecrawlFormat[]
  /** Whether to extract only the main content, stripping nav/footer/etc. (default: true) */
  onlyMainContent?: boolean
  /** Milliseconds to wait for client-rendered content before reading (default: 2000) */
  waitFor?: number
}

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_FIRECRAWL_OPTIONS = {
  formats: ['markdown'] as FirecrawlFormat[],
  onlyMainContent: true,
  waitFor: 2_000,
  /** Pages to fetch when discovering a website */
  maxPages: 8,
  /** Total chars budget across all discovered pages */
  contentBudget: 80_000,
  /** Total chars budget for help-center crawls (typically larger) */
  helpCenterBudget: 120_000,
  /** Max help-center pages to follow */
  helpCenterMaxPages: 25,
  /** Max docs depth (link-graph distance from the help-center root) */
  helpCenterMaxDepth: 2,
}

// ============================================================================
// Firecrawl Client
// ============================================================================

let firecrawlClient: FirecrawlApp | null = null

/**
 * Get the Firecrawl client, or null if no API key is configured.
 * Returning null lets callers fall back to the fetch + cheerio scraper
 * instead of throwing.
 */
function getFirecrawlClient(apiKey?: string): FirecrawlApp | null {
  const key = apiKey || process.env.FIRECRAWL_API_KEY
  if (!key) return null

  if (!firecrawlClient) {
    firecrawlClient = new FirecrawlApp({ apiKey: key })
  }

  return firecrawlClient
}

// ============================================================================
// Internal helpers
// ============================================================================

function buildScrapeArgs(options: FirecrawlScrapeOptions) {
  return {
    formats: (options.formats ?? DEFAULT_FIRECRAWL_OPTIONS.formats) as FirecrawlFormat[],
    onlyMainContent: options.onlyMainContent ?? DEFAULT_FIRECRAWL_OPTIONS.onlyMainContent,
    waitFor: options.waitFor ?? DEFAULT_FIRECRAWL_OPTIONS.waitFor,
  }
}

// ============================================================================
// Page Discovery
// ============================================================================

/**
 * Discover internal pages for a site using Firecrawl's sitemap-aware /v1/map.
 * Returns URLs filtered to the same origin, classified by purpose, sorted by
 * priority. Returns an empty array if Firecrawl is unavailable or errors —
 * callers should fall back to the cheerio-based discovery in that case.
 */
export async function discoverPagesWithFirecrawl(
  baseUrl: string,
  options: { apiKey?: string; limit?: number } = {},
): Promise<Array<{ url: string; type: string; title?: string; description?: string }>> {
  const client = getFirecrawlClient(options.apiKey)
  if (!client) return []

  let parsedOrigin: string
  try {
    parsedOrigin = new URL(baseUrl).origin
  } catch {
    return []
  }

  try {
    const data = await client.map(baseUrl, { limit: options.limit ?? 100 })
    const links = data?.links ?? []
    const seen = new Set<string>()
    const candidates: Array<{ url: string; type: string; title?: string; description?: string; priority: number }> = []

    for (const link of links) {
      const linkUrl = link?.url
      if (!linkUrl || !linkUrl.startsWith(parsedOrigin)) continue
      if (/\.(png|jpg|jpeg|gif|svg|pdf|zip|css|js|webp|ico)$/i.test(linkUrl)) continue
      if (/\/(login|signup|sign-up|register|auth|logout)\b/i.test(linkUrl)) continue

      const normalized = linkUrl.split('?')[0].split('#')[0].replace(/\/+$/, '') || linkUrl
      if (normalized === parsedOrigin || normalized === parsedOrigin + '/') continue
      if (seen.has(normalized)) continue
      seen.add(normalized)

      const type = classifyUrl(normalized)
      candidates.push({
        url: normalized,
        type,
        title: link.title,
        description: link.description,
        priority: priorityFor(type),
      })
    }

    candidates.sort((a, b) => a.priority - b.priority)
    return candidates.map(({ url, type, title, description }) => ({ url, type, title, description }))
  } catch {
    return []
  }
}

// ============================================================================
// Single-URL Scraping
// ============================================================================

/**
 * Scrape a single URL using Firecrawl, falling back to fetch + cheerio on
 * failure / empty content / missing API key.
 */
export async function scrapeUrlWithFirecrawl(
  url: string,
  options: FirecrawlScrapeOptions = {},
): Promise<ScrapeResult> {
  // Validate URL up-front so the fallback inherits the same error.
  try {
    const parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { url, success: false, error: `Invalid protocol: ${parsedUrl.protocol}` }
    }
  } catch (error) {
    return { url, success: false, error: error instanceof Error ? error.message : String(error) }
  }

  const client = getFirecrawlClient(options.apiKey)
  if (!client) return scrapeUrl(url, options)

  const maxContentLength = options.maxContentLength ?? 100_000

  try {
    const result = await client.scrape(url, buildScrapeArgs(options))

    let content = result.markdown || result.html || ''
    if (!content) return scrapeUrl(url, options)

    if (content.length > maxContentLength) {
      content = content.slice(0, maxContentLength) + '\n\n[Content truncated...]'
    }

    return {
      url,
      success: true,
      content,
      statusCode: result.metadata?.statusCode ?? 200,
      contentType: 'text/markdown',
      title: result.metadata?.title || result.metadata?.ogTitle,
      description: result.metadata?.description || result.metadata?.ogDescription,
    }
  } catch {
    return scrapeUrl(url, options)
  }
}

/**
 * Scrape multiple URLs using Firecrawl with bounded concurrency.
 */
export async function scrapeUrlsWithFirecrawl(
  urls: string[],
  options: FirecrawlScrapeOptions = {},
): Promise<ScrapeResult[]> {
  const concurrency = 3
  const results: ScrapeResult[] = []

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map((url) => scrapeUrlWithFirecrawl(url, options)))
    results.push(...batchResults)
  }

  return results
}

// ============================================================================
// Website Scraping
// ============================================================================

/**
 * Scrape a website using Firecrawl with sitemap-aware page discovery.
 *
 * 1. Map the site via /v1/map to discover real URLs (not guessed paths)
 * 2. Pick the top N pages by classification priority
 *    (pricing > features > about > integrations > customers > docs > other)
 * 3. Scrape each in parallel with `onlyMainContent: true`
 * 4. Distribute the content budget proportionally across pages
 *
 * Falls back to scrapeWebsite (fetch + cheerio) at every layer.
 */
export async function scrapeWebsiteWithFirecrawl(
  websiteUrl: string,
  options: FirecrawlScrapeOptions = {},
): Promise<ScrapeResult> {
  if (!getFirecrawlClient(options.apiKey)) {
    return scrapeWebsite(websiteUrl, options)
  }

  const maxPages = options.maxPages ?? DEFAULT_FIRECRAWL_OPTIONS.maxPages
  const contentBudget = options.contentBudget ?? DEFAULT_FIRECRAWL_OPTIONS.contentBudget

  try {
    // Step 1: discover. Try Firecrawl /v1/map; if empty, the homepage scrape
    // step will still let us extract its links via the fallback path.
    const discovered = await discoverPagesWithFirecrawl(websiteUrl, {
      apiKey: options.apiKey,
      limit: maxPages * 4,
    })

    // Step 2: pick (homepage + top extras up to maxPages total).
    const homepage = websiteUrl.replace(/\/+$/, '')
    const extras = discovered
      .filter(p => p.url !== homepage)
      .slice(0, Math.max(0, maxPages - 1))

    // Step 3: scrape the homepage and the picked extras in parallel.
    const targets = [{ url: websiteUrl, type: 'homepage' as string }, ...extras.map(({ url, type }) => ({ url, type }))]
    const scrapeResults = await scrapeUrlsWithFirecrawl(
      targets.map(t => t.url),
      options,
    )
    const annotated: Array<ScrapeResult & { pageType: string }> = scrapeResults.map((r, i) => ({
      ...r,
      pageType: targets[i].type,
    }))

    const successful = annotated.filter(r => r.success && r.content)
    if (successful.length === 0) {
      return scrapeWebsite(websiteUrl, options)
    }

    // Step 4: combine with content budget.
    const combined = combinePages(annotated, contentBudget)
    const homepageMeta = annotated.find(r => r.pageType === 'homepage')

    return {
      url: websiteUrl,
      success: true,
      content: combined,
      title: homepageMeta?.title,
      description: homepageMeta?.description,
    }
  } catch {
    return scrapeWebsite(websiteUrl, options)
  }
}

// ============================================================================
// Help Center Crawling
// ============================================================================

/**
 * Scrape a help center using Firecrawl's /v1/crawl. The SDK's `.crawl()`
 * starts a crawl job and waits for it to finish, returning all collected
 * pages — no manual polling needed.
 */
export async function scrapeHelpCenterWithFirecrawl(
  helpCenterUrl: string,
  options: FirecrawlScrapeOptions & { maxPages?: number; maxDepth?: number } = {},
): Promise<ScrapeResult> {
  const client = getFirecrawlClient(options.apiKey)
  if (!client) return scrapeHelpCenter(helpCenterUrl, options)

  const limit = options.maxPages ?? DEFAULT_FIRECRAWL_OPTIONS.helpCenterMaxPages
  const maxDepth = options.maxDepth ?? DEFAULT_FIRECRAWL_OPTIONS.helpCenterMaxDepth
  const contentBudget = options.contentBudget ?? DEFAULT_FIRECRAWL_OPTIONS.helpCenterBudget

  try {
    const job = await client.crawl(helpCenterUrl, {
      limit,
      maxDiscoveryDepth: maxDepth,
      scrapeOptions: buildScrapeArgs(options),
    })

    const docs = job?.data ?? []
    if (docs.length === 0) {
      return scrapeHelpCenter(helpCenterUrl, options)
    }

    const pages: Array<ScrapeResult & { pageType: string }> = docs
      .filter(d => d.markdown && d.markdown.length > 50)
      .map(d => ({
        url: d.metadata?.sourceURL || d.metadata?.url || helpCenterUrl,
        success: true,
        content: d.markdown,
        title: d.metadata?.title || d.metadata?.ogTitle,
        description: d.metadata?.description || d.metadata?.ogDescription,
        pageType: 'help-article',
      }))

    if (pages.length === 0) {
      return scrapeHelpCenter(helpCenterUrl, options)
    }

    const combined = combinePages(pages, contentBudget)
    const root = pages.find(p => p.url === helpCenterUrl) ?? pages[0]

    return {
      url: helpCenterUrl,
      success: true,
      content: combined,
      title: root.title,
      description: root.description,
    }
  } catch {
    return scrapeHelpCenter(helpCenterUrl, options)
  }
}

// ============================================================================
// Source Fetching
// ============================================================================

/**
 * Fetch content for an intelligence source using Firecrawl
 */
export async function fetchSourceWithFirecrawl(
  source: IntelligenceSource,
  options: FirecrawlScrapeOptions = {},
): Promise<IntelligenceSource> {
  if (source.type === 'schema' || source.type === 'readme') {
    if (source.content) return { ...source, status: 'success' }
    return { ...source, status: 'failed', error: 'No content provided' }
  }

  const result = await scrapeUrlWithFirecrawl(source.location, options)
  if (result.success) return { ...source, status: 'success', content: result.content }
  return { ...source, status: 'failed', error: result.error }
}

/**
 * Fetch content for multiple intelligence sources using Firecrawl
 */
export async function fetchSourcesWithFirecrawl(
  sources: IntelligenceSource[],
  options: FirecrawlScrapeOptions = {},
): Promise<IntelligenceSource[]> {
  return Promise.all(sources.map((source) => fetchSourceWithFirecrawl(source, options)))
}
