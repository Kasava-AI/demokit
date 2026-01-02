/**
 * Web Scraper Service
 *
 * Service to fetch and parse content from websites and help centers.
 * This module provides a simple interface for gathering external content
 * that can be used for app intelligence synthesis.
 *
 * In production, this would integrate with firecrawl or similar services.
 * For now, it provides a fetch-based implementation with fallbacks.
 *
 * @module
 */

import type { IntelligenceSource } from './types'

// ============================================================================
// Types
// ============================================================================

/**
 * Options for web scraping
 */
export interface ScrapeOptions {
  /** Timeout in milliseconds */
  timeout?: number
  /** Maximum content length to return */
  maxContentLength?: number
  /** Whether to follow redirects */
  followRedirects?: boolean
  /** User agent string */
  userAgent?: string
}

/**
 * Result of a scrape operation
 */
export interface ScrapeResult {
  /** The URL that was scraped */
  url: string
  /** Whether the scrape was successful */
  success: boolean
  /** The extracted content (markdown) */
  content?: string
  /** Error message if failed */
  error?: string
  /** HTTP status code */
  statusCode?: number
  /** Content type from response */
  contentType?: string
}

// ============================================================================
// Default Options
// ============================================================================

const DEFAULT_OPTIONS: Required<ScrapeOptions> = {
  timeout: 30000,
  maxContentLength: 100000,
  followRedirects: true,
  userAgent: 'DemoKit/1.0 (App Intelligence Gatherer)',
}

// ============================================================================
// Scraper Implementation
// ============================================================================

/**
 * Scrape content from a URL
 *
 * This is a simple fetch-based implementation.
 * In production, integrate with firecrawl for better results.
 *
 * @param url - URL to scrape
 * @param options - Scrape options
 * @returns Scrape result with content or error
 */
export async function scrapeUrl(
  url: string,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

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

    // Fetch with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), opts.timeout)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': opts.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: opts.followRedirects ? 'follow' : 'manual',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return {
        url,
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status,
      }
    }

    const contentType = response.headers.get('content-type') || ''
    const text = await response.text()

    // Extract main content from HTML
    const content = contentType.includes('text/html')
      ? extractTextFromHtml(text, opts.maxContentLength)
      : text.slice(0, opts.maxContentLength)

    return {
      url,
      success: true,
      content,
      statusCode: response.status,
      contentType,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      url,
      success: false,
      error: message.includes('abort') ? 'Request timed out' : message,
    }
  }
}

/**
 * Extract readable text from HTML
 *
 * Simple extraction that removes scripts, styles, and tags.
 * For production, use a proper HTML-to-markdown converter.
 */
function extractTextFromHtml(html: string, maxLength: number): string {
  // Remove script and style elements
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')

  // Convert some elements to markdown-like format
  text = text
    // Headers
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n')
    // Paragraphs and divs
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    // Lists
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/li>/gi, '')
    // Links - keep the text
    .replace(/<a[^>]*>(.*?)<\/a>/gi, '$1')
    // Remove remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim()

  return text.slice(0, maxLength)
}

// ============================================================================
// Batch Scraping
// ============================================================================

/**
 * Scrape multiple URLs in parallel
 *
 * @param urls - URLs to scrape
 * @param options - Scrape options
 * @returns Array of scrape results
 */
export async function scrapeUrls(
  urls: string[],
  options: ScrapeOptions = {}
): Promise<ScrapeResult[]> {
  // Limit concurrency to avoid rate limiting
  const concurrency = 3
  const results: ScrapeResult[] = []

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map(url => scrapeUrl(url, options))
    )
    results.push(...batchResults)
  }

  return results
}

// ============================================================================
// Source Fetching
// ============================================================================

/**
 * Fetch content for an intelligence source
 *
 * Updates the source in place with content or error.
 *
 * @param source - Intelligence source to fetch
 * @param options - Scrape options
 * @returns Updated intelligence source
 */
export async function fetchSource(
  source: IntelligenceSource,
  options: ScrapeOptions = {}
): Promise<IntelligenceSource> {
  // Schema and readme are handled differently
  if (source.type === 'schema' || source.type === 'readme') {
    // These are already provided as content
    if (source.content) {
      return { ...source, status: 'success' }
    }
    return { ...source, status: 'failed', error: 'No content provided' }
  }

  // Fetch web content
  const result = await scrapeUrl(source.location, options)

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
 * Fetch content for multiple intelligence sources
 *
 * @param sources - Intelligence sources to fetch
 * @param options - Scrape options
 * @returns Updated intelligence sources
 */
export async function fetchSources(
  sources: IntelligenceSource[],
  options: ScrapeOptions = {}
): Promise<IntelligenceSource[]> {
  return Promise.all(
    sources.map(source => fetchSource(source, options))
  )
}

// ============================================================================
// Help Center Specific Functions
// ============================================================================

/**
 * Scrape a help center and extract article content
 *
 * Attempts to find and follow links to help articles.
 * Returns combined content from multiple pages.
 *
 * @param helpCenterUrl - Base URL of help center
 * @param options - Scrape options with additional settings
 * @returns Combined content from help center
 */
export async function scrapeHelpCenter(
  helpCenterUrl: string,
  options: ScrapeOptions & {
    maxPages?: number
  } = {}
): Promise<ScrapeResult> {
  const { maxPages: _maxPages = 5, ...scrapeOpts } = options

  // First, get the main help center page
  const mainResult = await scrapeUrl(helpCenterUrl, scrapeOpts)
  if (!mainResult.success) {
    return mainResult
  }

  // For now, just return the main page content
  // A more advanced implementation would:
  // 1. Extract article links from the main page
  // 2. Fetch top articles
  // 3. Combine content

  return mainResult
}

// ============================================================================
// Website Specific Functions
// ============================================================================

/**
 * Scrape a website's key pages for app intelligence
 *
 * Attempts to fetch homepage, features page, and pricing page.
 *
 * @param websiteUrl - Base URL of website
 * @param options - Scrape options
 * @returns Combined content from website
 */
export async function scrapeWebsite(
  websiteUrl: string,
  options: ScrapeOptions = {}
): Promise<ScrapeResult> {
  try {
    const baseUrl = new URL(websiteUrl)
    const pagesToTry = [
      websiteUrl,
      new URL('/features', baseUrl).toString(),
      new URL('/product', baseUrl).toString(),
      new URL('/about', baseUrl).toString(),
    ]

    const results = await scrapeUrls(pagesToTry, options)
    const successfulResults = results.filter(r => r.success && r.content)

    if (successfulResults.length === 0) {
      return {
        url: websiteUrl,
        success: false,
        error: 'Could not fetch any pages from website',
      }
    }

    // Combine content from successful pages
    const combinedContent = successfulResults
      .map(r => `--- Page: ${r.url} ---\n${r.content}`)
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
