/**
 * Intelligence Tools
 *
 * Mastra tool definitions for web scraping operations.
 * Wrapping scrapers as tools gives us:
 * - Zod-validated input/output schemas
 * - toModelOutput() for token-efficient summaries
 * - Lifecycle hooks for logging/analytics
 * - Reusability across agents and workflows
 *
 * @module
 */

import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { scrapeUrl, scrapeWebsite, scrapeHelpCenter } from './web-scraper'
import type { ScrapeOptions } from './web-scraper'

// ============================================================================
// Schemas
// ============================================================================

const ScrapeInputSchema = z.object({
  url: z.string().describe('URL to scrape'),
  timeout: z.number().optional().describe('Timeout in milliseconds'),
  maxContentLength: z.number().optional().describe('Maximum content length to return'),
})

const ScrapeOutputSchema = z.object({
  url: z.string(),
  success: z.boolean(),
  content: z.string().optional(),
  error: z.string().optional(),
  statusCode: z.number().optional(),
  contentType: z.string().optional(),
})

const WebsiteScrapeInputSchema = z.object({
  url: z.string().describe('Base URL of website to scrape'),
  timeout: z.number().optional().describe('Timeout in milliseconds'),
  maxContentLength: z.number().optional().describe('Maximum content length'),
})

const HelpCenterScrapeInputSchema = z.object({
  url: z.string().describe('Help center URL to scrape'),
  maxPages: z.number().optional().describe('Maximum pages to scrape'),
  timeout: z.number().optional().describe('Timeout in milliseconds'),
})

// ============================================================================
// Tools
// ============================================================================

/**
 * Tool for scraping a single URL
 *
 * Returns full content for application use, compact summary for model context.
 */
export const scrapeUrlTool = createTool({
  id: 'scrape-url',
  description: 'Scrape content from a single URL and return markdown text',
  inputSchema: ScrapeInputSchema,
  outputSchema: ScrapeOutputSchema,
  execute: async (input) => {
    const opts: ScrapeOptions = {}
    if (input.timeout) opts.timeout = input.timeout
    if (input.maxContentLength) opts.maxContentLength = input.maxContentLength

    return scrapeUrl(input.url, opts)
  },
  toModelOutput: (result) => {
    if (!result.success) {
      return { type: 'text' as const, value: `Scrape failed for ${result.url}: ${result.error}` }
    }
    // Compact summary for model context — full data flows to the app
    const preview = result.content?.slice(0, 3000) ?? ''
    return {
      type: 'text' as const,
      value: `Scraped ${result.url} (${result.content?.length ?? 0} chars). Preview:\n${preview}`,
    }
  },
})

/**
 * Tool for scraping a website's key pages (homepage, features, about, product)
 */
export const scrapeWebsiteTool = createTool({
  id: 'scrape-website',
  description:
    'Scrape key pages from a website (homepage, features, product, about) and return combined content',
  inputSchema: WebsiteScrapeInputSchema,
  outputSchema: ScrapeOutputSchema,
  execute: async (input) => {
    const opts: ScrapeOptions = {}
    if (input.timeout) opts.timeout = input.timeout
    if (input.maxContentLength) opts.maxContentLength = input.maxContentLength

    return scrapeWebsite(input.url, opts)
  },
  toModelOutput: (result) => {
    if (!result.success) {
      return { type: 'text' as const, value: `Website scrape failed: ${result.error}` }
    }
    const preview = result.content?.slice(0, 4000) ?? ''
    return {
      type: 'text' as const,
      value: `Scraped website ${result.url} (${result.content?.length ?? 0} chars). Preview:\n${preview}`,
    }
  },
})

/**
 * Tool for scraping help center content
 */
export const scrapeHelpCenterTool = createTool({
  id: 'scrape-help-center',
  description: 'Scrape help center content from a URL',
  inputSchema: HelpCenterScrapeInputSchema,
  outputSchema: ScrapeOutputSchema,
  execute: async (input) => {
    const opts: ScrapeOptions & { maxPages?: number } = {}
    if (input.maxPages) opts.maxPages = input.maxPages
    if (input.timeout) opts.timeout = input.timeout

    return scrapeHelpCenter(input.url, opts)
  },
  toModelOutput: (result) => {
    if (!result.success) {
      return { type: 'text' as const, value: `Help center scrape failed: ${result.error}` }
    }
    const preview = result.content?.slice(0, 3000) ?? ''
    return {
      type: 'text' as const,
      value: `Scraped help center ${result.url} (${result.content?.length ?? 0} chars). Preview:\n${preview}`,
    }
  },
})

/**
 * Tool for fetching a documentation URL
 */
export const fetchDocumentationTool = createTool({
  id: 'fetch-documentation',
  description: 'Fetch content from a documentation URL',
  inputSchema: z.object({
    url: z.string().describe('Documentation URL to fetch'),
    timeout: z.number().optional().describe('Timeout in milliseconds'),
  }),
  outputSchema: z.object({
    url: z.string(),
    success: z.boolean(),
    content: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async (input) => {
    try {
      const response = await fetch(input.url, {
        headers: { 'User-Agent': 'DemoKit/1.0' },
        signal: AbortSignal.timeout(input.timeout || 30000),
      })
      if (response.ok) {
        const content = await response.text()
        return { url: input.url, success: true, content }
      }
      return { url: input.url, success: false, error: `HTTP ${response.status}` }
    } catch (error) {
      return {
        url: input.url,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
  toModelOutput: (result) => {
    if (!result.success) {
      return { type: 'text' as const, value: `Doc fetch failed for ${result.url}: ${result.error}` }
    }
    const preview = result.content?.slice(0, 2000) ?? ''
    return {
      type: 'text' as const,
      value: `Fetched ${result.url} (${result.content?.length ?? 0} chars). Preview:\n${preview}`,
    }
  },
})
