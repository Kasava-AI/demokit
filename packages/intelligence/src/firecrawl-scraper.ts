/**
 * Firecrawl Web Scraper
 *
 * Uses Firecrawl API for high-quality web scraping with:
 * - JavaScript rendering support
 * - Clean markdown extraction
 * - Better content parsing
 *
 * @module
 */

import FirecrawlApp from '@mendable/firecrawl-js'
import type { IntelligenceSource } from './types'
import type { ScrapeResult, ScrapeOptions } from './web-scraper'

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
  /** Whether to wait for JavaScript rendering */
  waitForJs?: boolean
  /** Formats to extract */
  formats?: FirecrawlFormat[]
}

// ============================================================================
// Firecrawl Client
// ============================================================================

let firecrawlClient: FirecrawlApp | null = null

/**
 * Get or create the Firecrawl client
 */
function getFirecrawlClient(apiKey?: string): FirecrawlApp {
  const key = apiKey || process.env.FIRECRAWL_API_KEY
  if (!key) {
    throw new Error('FIRECRAWL_API_KEY environment variable is not set')
  }

  if (!firecrawlClient) {
    firecrawlClient = new FirecrawlApp({ apiKey: key })
  }

  return firecrawlClient
}

// ============================================================================
// Scraping Functions
// ============================================================================

/**
 * Scrape a single URL using Firecrawl
 *
 * @param url - URL to scrape
 * @param options - Scrape options
 * @returns Scrape result with markdown content
 */
export async function scrapeUrlWithFirecrawl(
  url: string,
  options: FirecrawlScrapeOptions = {}
): Promise<ScrapeResult> {
  const { apiKey, formats = ['markdown'], maxContentLength = 100000 } = options

  try {
    // Validate URL
    const parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return {
        url,
        success: false,
        error: `Invalid protocol: ${parsedUrl.protocol}`,
      }
    }

    const client = getFirecrawlClient(apiKey)

    const result = await client.scrape(url, {
      formats: formats as ('markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot')[],
    })

    // Get content from the result (new API returns document directly)
    let content = result.markdown || result.html || ''

    if (!content) {
      return {
        url,
        success: false,
        error: 'No content returned from Firecrawl',
      }
    }

    // Truncate if needed
    if (content.length > maxContentLength) {
      content = content.slice(0, maxContentLength) + '\n\n[Content truncated...]'
    }

    return {
      url,
      success: true,
      content,
      statusCode: 200,
      contentType: 'text/markdown',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      url,
      success: false,
      error: message,
    }
  }
}

/**
 * Scrape multiple URLs using Firecrawl
 *
 * @param urls - URLs to scrape
 * @param options - Scrape options
 * @returns Array of scrape results
 */
export async function scrapeUrlsWithFirecrawl(
  urls: string[],
  options: FirecrawlScrapeOptions = {}
): Promise<ScrapeResult[]> {
  // Firecrawl handles rate limiting, but we still batch for better control
  const concurrency = 3
  const results: ScrapeResult[] = []

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map((url) => scrapeUrlWithFirecrawl(url, options))
    )
    results.push(...batchResults)
  }

  return results
}

/**
 * Scrape a website's key pages using Firecrawl
 *
 * Attempts to fetch homepage, features page, and about page.
 *
 * @param websiteUrl - Base URL of website
 * @param options - Scrape options
 * @returns Combined content from website
 */
export async function scrapeWebsiteWithFirecrawl(
  websiteUrl: string,
  options: FirecrawlScrapeOptions = {}
): Promise<ScrapeResult> {
  try {
    const baseUrl = new URL(websiteUrl)
    const pagesToTry = [
      websiteUrl,
      new URL('/features', baseUrl).toString(),
      new URL('/product', baseUrl).toString(),
      new URL('/about', baseUrl).toString(),
    ]

    const results = await scrapeUrlsWithFirecrawl(pagesToTry, options)
    const successfulResults = results.filter((r) => r.success && r.content)

    if (successfulResults.length === 0) {
      return {
        url: websiteUrl,
        success: false,
        error: 'Could not fetch any pages from website',
      }
    }

    // Combine content from successful pages
    const combinedContent = successfulResults
      .map((r) => `--- Page: ${r.url} ---\n${r.content}`)
      .join('\n\n')

    return {
      url: websiteUrl,
      success: true,
      content: combinedContent,
    }
  } catch (error) {
    return {
      url: websiteUrl,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Scrape a help center using Firecrawl
 *
 * @param helpCenterUrl - Help center URL
 * @param options - Scrape options
 * @returns Help center content
 */
export async function scrapeHelpCenterWithFirecrawl(
  helpCenterUrl: string,
  options: FirecrawlScrapeOptions & { maxPages?: number } = {}
): Promise<ScrapeResult> {
  const { maxPages: _maxPages = 5, ...scrapeOpts } = options

  // First, get the main help center page
  const mainResult = await scrapeUrlWithFirecrawl(helpCenterUrl, scrapeOpts)
  if (!mainResult.success) {
    return mainResult
  }

  // For now, just return the main page content
  // A more advanced implementation could use Firecrawl's crawl API
  // to get multiple help articles
  return mainResult
}

/**
 * Fetch content for an intelligence source using Firecrawl
 *
 * @param source - Intelligence source to fetch
 * @param options - Scrape options
 * @returns Updated intelligence source
 */
export async function fetchSourceWithFirecrawl(
  source: IntelligenceSource,
  options: FirecrawlScrapeOptions = {}
): Promise<IntelligenceSource> {
  // Schema and readme are handled differently
  if (source.type === 'schema' || source.type === 'readme') {
    if (source.content) {
      return { ...source, status: 'success' }
    }
    return { ...source, status: 'failed', error: 'No content provided' }
  }

  // Fetch web content with Firecrawl
  const result = await scrapeUrlWithFirecrawl(source.location, options)

  if (result.success) {
    return {
      ...source,
      status: 'success',
      content: result.content,
    }
  }

  return {
    ...source,
    status: 'failed',
    error: result.error,
  }
}

/**
 * Fetch content for multiple intelligence sources using Firecrawl
 *
 * @param sources - Intelligence sources to fetch
 * @param options - Scrape options
 * @returns Updated intelligence sources
 */
export async function fetchSourcesWithFirecrawl(
  sources: IntelligenceSource[],
  options: FirecrawlScrapeOptions = {}
): Promise<IntelligenceSource[]> {
  return Promise.all(sources.map((source) => fetchSourceWithFirecrawl(source, options)))
}
