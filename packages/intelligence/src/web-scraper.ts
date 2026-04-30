/**
 * Web Scraper Service
 *
 * Fetch + cheerio implementation. Used directly when Firecrawl is disabled,
 * and used as a fallback by ./firecrawl-scraper when Firecrawl is unavailable
 * or returns empty content.
 *
 * Capabilities:
 * - Real browser User-Agent (sites commonly serve empty/blocked HTML to bots)
 * - Cheerio-based content + metadata extraction
 * - Internal-link + sitemap.xml page discovery, classified by purpose
 * - Total content budget across multiple pages instead of per-page truncation
 *
 * @module
 */

import * as cheerio from 'cheerio'
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
  /** Maximum content length per page */
  maxContentLength?: number
  /** Whether to follow redirects */
  followRedirects?: boolean
  /** User agent string */
  userAgent?: string
  /** Total chars budget across all pages when scraping a multi-page site */
  contentBudget?: number
  /** Max pages to fetch when discovering a site (homepage + N internal pages) */
  maxPages?: number
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
  /** Page title (from <title> or og:title) */
  title?: string
  /** Page description (from meta[name=description] or og:description) */
  description?: string
  /** Classified page type (e.g. 'homepage', 'pricing', 'features') */
  pageType?: string
}

// ============================================================================
// Default Options
// ============================================================================

// Real browser UA. Many sites (Cloudflare-fronted especially) serve 403 or
// empty shells to bot-like UAs.
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const DEFAULT_OPTIONS: Required<ScrapeOptions> = {
  timeout: 30_000,
  maxContentLength: 100_000,
  followRedirects: true,
  userAgent: DEFAULT_USER_AGENT,
  contentBudget: 80_000,
  maxPages: 8,
}

// ============================================================================
// Page Classification
// ============================================================================

/** Page categories we actively look for, in priority order */
export const PAGE_PATTERNS: ReadonlyArray<{ type: string; patterns: RegExp[] }> = [
  { type: 'pricing', patterns: [/\/pric/i, /\/plans?\b/i] },
  { type: 'features', patterns: [/\/features?\b/i, /\/product\b/i, /\/solutions?\b/i, /\/capabilities/i] },
  { type: 'about', patterns: [/\/about\b/i, /\/company\b/i, /\/team\b/i, /\/story\b/i] },
  { type: 'integrations', patterns: [/\/integrations?\b/i, /\/partners?\b/i, /\/ecosystem\b/i] },
  { type: 'customers', patterns: [/\/customers?\b/i, /\/case.stud/i, /\/testimonials?\b/i, /\/success/i] },
  { type: 'docs', patterns: [/\/docs?\b/i, /\/documentation\b/i, /\/api\b/i] },
]

export function classifyUrl(url: string): string {
  for (const { type, patterns } of PAGE_PATTERNS) {
    if (patterns.some(p => p.test(url))) return type
  }
  return 'other'
}

export function priorityFor(type: string): number {
  if (type === 'other') return 99
  const idx = PAGE_PATTERNS.findIndex(p => p.type === type)
  return idx >= 0 ? idx : 99
}

// ============================================================================
// Fetch + Parse
// ============================================================================

type FetchedPage = {
  $: cheerio.CheerioAPI
  finalUrl: string
  statusCode: number
  contentType: string
  rawHtml: string
}

async function fetchAndParse(
  url: string,
  opts: Required<ScrapeOptions>,
): Promise<{ ok: true; page: FetchedPage } | { ok: false; error: string; statusCode?: number }> {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return { ok: false, error: `Invalid protocol: ${parsedUrl.protocol}` }
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': opts.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: opts.followRedirects ? 'follow' : 'manual',
      signal: AbortSignal.timeout(opts.timeout),
    })

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}: ${response.statusText}`, statusCode: response.status }
    }

    const contentType = response.headers.get('content-type') || ''
    const rawHtml = await response.text()

    // Non-HTML content types skip parsing.
    if (!contentType.includes('text/html')) {
      const $ = cheerio.load('')
      return { ok: true, page: { $, finalUrl: response.url || url, statusCode: response.status, contentType, rawHtml } }
    }

    const $ = cheerio.load(rawHtml)
    return { ok: true, page: { $, finalUrl: response.url || url, statusCode: response.status, contentType, rawHtml } }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: message.includes('abort') || message.includes('timeout') ? 'Request timed out' : message }
  }
}

// ============================================================================
// Extraction
// ============================================================================

/**
 * Extract page metadata (title, description) from a parsed document.
 */
export function extractMetadata($: cheerio.CheerioAPI): { title?: string; description?: string } {
  const title =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('title').first().text().trim() ||
    undefined
  const description =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    undefined
  return { title, description }
}

/**
 * Extract readable markdown-ish text from a parsed document.
 *
 * Strips chrome (nav, header, footer, scripts, etc.), prefers main/article
 * content when present, and emits a lightweight markdown representation
 * preserving heading levels, paragraphs, lists, and code blocks.
 */
export function extractMarkdown($: cheerio.CheerioAPI, maxLength: number): string {
  // Clone so we don't mutate the cheerio instance the caller may reuse for
  // metadata / link discovery.
  const $$ = cheerio.load($.html())

  $$('script, style, noscript, nav, header, footer, aside, iframe, svg, [role="navigation"], [role="banner"], [role="contentinfo"]').remove()

  const main = $$('main, article, [role="main"], #main, #content, .content').first()
  const root = main.length ? main : $$('body')

  const parts: string[] = []
  root.find('h1, h2, h3, h4, h5, h6, p, li, pre').each((_, el) => {
    const tag = (el as { tagName?: string }).tagName?.toLowerCase()
    if (!tag) return
    const $el = $$(el)
    const text = $el.text().replace(/\s+/g, ' ').trim()
    if (!text) return

    if (tag.length === 2 && tag.startsWith('h')) {
      const level = Number(tag[1])
      parts.push(`\n${'#'.repeat(level)} ${text}\n`)
    } else if (tag === 'li') {
      parts.push(`- ${text}`)
    } else if (tag === 'pre') {
      parts.push(`\n\`\`\`\n${$el.text().trim()}\n\`\`\`\n`)
    } else {
      parts.push(text)
    }
  })

  const result = parts.length
    ? parts.join('\n').replace(/\n{3,}/g, '\n\n').trim()
    : root.text().replace(/\s+/g, ' ').trim()

  return result.slice(0, maxLength)
}

// ============================================================================
// Page Discovery
// ============================================================================

/**
 * Discover internal pages for a website by parsing homepage links and the
 * site's sitemap.xml. Returns deduped URLs sorted by classification priority.
 */
export async function discoverPagesFromHtml(
  $: cheerio.CheerioAPI,
  baseUrl: string,
  opts: { maxPages?: number; userAgent?: string; timeout?: number } = {},
): Promise<Array<{ url: string; type: string }>> {
  const { maxPages = 30, userAgent = DEFAULT_USER_AGENT, timeout = 15_000 } = opts
  const origin = new URL(baseUrl).origin
  const seen = new Set<string>()
  const candidates: Array<{ url: string; type: string; priority: number }> = []

  const consider = (rawUrl: string): void => {
    let resolved: string
    try {
      resolved = new URL(rawUrl, baseUrl).href
    } catch {
      return
    }
    if (!resolved.startsWith(origin)) return
    if (/\.(png|jpg|jpeg|gif|svg|pdf|zip|css|js|webp|ico)$/i.test(resolved)) return
    if (/\/(login|signup|sign-up|register|auth|logout)\b/i.test(resolved)) return

    const normalized = resolved.split('?')[0].split('#')[0].replace(/\/+$/, '') || resolved
    if (normalized === origin || normalized === origin + '/') return
    if (seen.has(normalized)) return
    seen.add(normalized)

    const type = classifyUrl(normalized)
    candidates.push({ url: normalized, type, priority: priorityFor(type) })
  }

  // 1. Parse homepage links
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (href) consider(href)
  })

  // 2. Try sitemap.xml — many sites surface pages here that aren't linked from
  // the homepage (especially marketing-page generators).
  try {
    const resp = await fetch(`${origin}/sitemap.xml`, {
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(timeout),
    })
    if (resp.ok) {
      const xml = await resp.text()
      const $xml = cheerio.load(xml, { xmlMode: true })
      $xml('loc').each((_, el) => {
        const loc = $xml(el).text().trim()
        if (loc) consider(loc)
      })
    }
  } catch {
    // sitemap unavailable — non-fatal
  }

  candidates.sort((a, b) => a.priority - b.priority)
  return candidates.slice(0, maxPages).map(({ url, type }) => ({ url, type }))
}

// ============================================================================
// Public Scraping API
// ============================================================================

/**
 * Scrape content from a single URL.
 */
export async function scrapeUrl(
  url: string,
  options: ScrapeOptions = {},
): Promise<ScrapeResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const fetched = await fetchAndParse(url, opts)
  if (!fetched.ok) {
    return { url, success: false, error: fetched.error, statusCode: fetched.statusCode }
  }

  const { page } = fetched
  const isHtml = page.contentType.includes('text/html')
  const content = isHtml
    ? extractMarkdown(page.$, opts.maxContentLength)
    : page.rawHtml.slice(0, opts.maxContentLength)
  const meta = isHtml ? extractMetadata(page.$) : {}

  return {
    url,
    success: true,
    content,
    statusCode: page.statusCode,
    contentType: page.contentType,
    title: meta.title,
    description: meta.description,
  }
}

/**
 * Scrape multiple URLs with bounded concurrency.
 */
export async function scrapeUrls(
  urls: string[],
  options: ScrapeOptions = {},
): Promise<ScrapeResult[]> {
  const concurrency = 3
  const results: ScrapeResult[] = []
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(url => scrapeUrl(url, options)))
    results.push(...batchResults)
  }
  return results
}

// ============================================================================
// Source Fetching
// ============================================================================

export async function fetchSource(
  source: IntelligenceSource,
  options: ScrapeOptions = {},
): Promise<IntelligenceSource> {
  if (source.type === 'schema' || source.type === 'readme') {
    if (source.content) return { ...source, status: 'success' }
    return { ...source, status: 'failed', error: 'No content provided' }
  }

  const result = await scrapeUrl(source.location, options)
  if (result.success) return { ...source, status: 'success', content: result.content }
  return { ...source, status: 'failed', error: result.error }
}

export async function fetchSources(
  sources: IntelligenceSource[],
  options: ScrapeOptions = {},
): Promise<IntelligenceSource[]> {
  return Promise.all(sources.map(source => fetchSource(source, options)))
}

// ============================================================================
// Multi-page Helpers
// ============================================================================

/**
 * Combine per-page results into a single markdown blob with section headers.
 * Allocates the content budget proportionally across pages.
 */
export function combinePages(
  pages: Array<ScrapeResult & { pageType?: string }>,
  contentBudget: number,
): string {
  const successful = pages.filter(p => p.success && p.content)
  if (successful.length === 0) return ''

  const perPage = Math.max(2_000, Math.floor(contentBudget / successful.length))
  return successful
    .map(p => {
      const head = `--- Page: ${p.url}${p.pageType ? ` (${p.pageType})` : ''} ---`
      const titleLine = p.title ? `Title: ${p.title}\n` : ''
      const descLine = p.description ? `Description: ${p.description}\n` : ''
      const body = (p.content ?? '').slice(0, perPage)
      return `${head}\n${titleLine}${descLine}${body}`
    })
    .join('\n\n')
}

// ============================================================================
// Help Center
// ============================================================================

/**
 * Scrape a help center: fetch the landing page, then follow same-prefix
 * article links and combine.
 */
export async function scrapeHelpCenter(
  helpCenterUrl: string,
  options: ScrapeOptions & { maxPages?: number } = {},
): Promise<ScrapeResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const maxPages = options.maxPages ?? 5

  const fetched = await fetchAndParse(helpCenterUrl, opts)
  if (!fetched.ok) {
    return { url: helpCenterUrl, success: false, error: fetched.error, statusCode: fetched.statusCode }
  }

  const { page: home } = fetched
  const homeMeta = extractMetadata(home.$)
  const homeContent = extractMarkdown(home.$, opts.maxContentLength)

  // Discover article links: same origin, under the help-center path prefix.
  const baseOrigin = new URL(helpCenterUrl).origin
  const basePath = new URL(helpCenterUrl).pathname.replace(/\/$/, '')
  const articleUrls: string[] = []
  const seen = new Set<string>([helpCenterUrl])
  home.$('a[href]').each((_, el) => {
    if (articleUrls.length >= maxPages - 1) return
    const href = home.$(el).attr('href')
    if (!href) return
    try {
      const resolved = new URL(href, helpCenterUrl)
      if (resolved.origin !== baseOrigin) return
      if (basePath && !resolved.pathname.startsWith(basePath)) return
      resolved.hash = ''
      resolved.search = ''
      const norm = resolved.toString().replace(/\/+$/, '')
      if (seen.has(norm)) return
      seen.add(norm)
      articleUrls.push(norm)
    } catch {
      // skip
    }
  })

  const articles = await scrapeUrls(articleUrls, opts)

  const homeResult: ScrapeResult & { pageType: string } = {
    url: helpCenterUrl,
    success: true,
    content: homeContent,
    title: homeMeta.title,
    description: homeMeta.description,
    pageType: 'help-center',
    statusCode: home.statusCode,
    contentType: home.contentType,
  }
  const all: Array<ScrapeResult & { pageType?: string }> = [homeResult, ...articles.map(a => ({ ...a, pageType: 'help-article' }))]
  const combined = combinePages(all, opts.contentBudget)

  return {
    url: helpCenterUrl,
    success: true,
    content: combined,
    title: homeMeta.title,
    description: homeMeta.description,
    statusCode: home.statusCode,
    contentType: home.contentType,
  }
}

// ============================================================================
// Website
// ============================================================================

/**
 * Scrape a website's high-value pages.
 *
 * 1. Fetch the homepage (one round-trip)
 * 2. Discover internal pages via the homepage's links + sitemap.xml
 * 3. Classify and prioritize (pricing > features > about > integrations > ...)
 * 4. Fetch the top N pages, distributing the content budget across them
 */
export async function scrapeWebsite(
  websiteUrl: string,
  options: ScrapeOptions = {},
): Promise<ScrapeResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  const fetched = await fetchAndParse(websiteUrl, opts)
  if (!fetched.ok) {
    return { url: websiteUrl, success: false, error: fetched.error, statusCode: fetched.statusCode }
  }

  const { page: home } = fetched
  const homeMeta = extractMetadata(home.$)

  const discovered = await discoverPagesFromHtml(home.$, websiteUrl, {
    maxPages: opts.maxPages * 3, // over-discover, then filter
    userAgent: opts.userAgent,
    timeout: opts.timeout,
  })
  // Pick the top (maxPages - 1) discovered pages — homepage takes one slot.
  const pickedExtras = discovered.slice(0, Math.max(0, opts.maxPages - 1))

  // Fetch the extras in parallel.
  const extras = await scrapeUrls(pickedExtras.map(p => p.url), opts)
  const extrasWithType = extras.map((r, i) => ({ ...r, pageType: pickedExtras[i].type }))

  // Build the homepage result reusing the cheerio we already parsed.
  const homeContent = extractMarkdown(home.$, opts.maxContentLength)
  const homeResult: ScrapeResult & { pageType: string } = {
    url: websiteUrl,
    success: true,
    content: homeContent,
    title: homeMeta.title,
    description: homeMeta.description,
    pageType: 'homepage',
    statusCode: home.statusCode,
    contentType: home.contentType,
  }

  const combined = combinePages([homeResult, ...extrasWithType], opts.contentBudget)
  if (!combined) {
    return { url: websiteUrl, success: false, error: 'Could not extract content from website' }
  }

  return {
    url: websiteUrl,
    success: true,
    content: combined,
    title: homeMeta.title,
    description: homeMeta.description,
    statusCode: home.statusCode,
    contentType: home.contentType,
  }
}
