/**
 * Centralized color utilities for data visualization.
 *
 * These use Tailwind color classes for intentional data visualization
 * (HTTP methods, schema clusters, status indicators). This is acceptable
 * per Design Principle 6 — status colors aid fast scanning.
 *
 * All other UI elements should use semantic tokens (bg-primary, text-muted, etc.).
 */

// ---------------------------------------------------------------------------
// HTTP Method Colors
// ---------------------------------------------------------------------------

const HTTP_METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  POST: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  PUT: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  PATCH: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  DELETE: 'bg-red-500/10 text-red-600 border-red-500/20',
}

const HTTP_METHOD_DEFAULT = 'bg-muted text-muted-foreground border-border'

export function httpMethodColor(method: string): string {
  return HTTP_METHOD_COLORS[method.toUpperCase()] ?? HTTP_METHOD_DEFAULT
}

// ---------------------------------------------------------------------------
// Schema Cluster Colors
// ---------------------------------------------------------------------------

export interface SchemaCluster {
  pattern: RegExp
  name: string
  color: string
  bgColor: string
  textColor: string
  borderColor: string
}

const CLUSTER_PALETTE = [
  { name: 'Auth', color: 'bg-blue-500', bgColor: 'bg-blue-500/10', textColor: 'text-blue-600', borderColor: 'border-blue-500/20' },
  { name: 'Orders', color: 'bg-green-500', bgColor: 'bg-green-500/10', textColor: 'text-green-600', borderColor: 'border-green-500/20' },
  { name: 'Products', color: 'bg-purple-500', bgColor: 'bg-purple-500/10', textColor: 'text-purple-600', borderColor: 'border-purple-500/20' },
  { name: 'Integrations', color: 'bg-orange-500', bgColor: 'bg-orange-500/10', textColor: 'text-orange-600', borderColor: 'border-orange-500/20' },
  { name: 'Analytics', color: 'bg-cyan-500', bgColor: 'bg-cyan-500/10', textColor: 'text-cyan-600', borderColor: 'border-cyan-500/20' },
  { name: 'Config', color: 'bg-muted-foreground', bgColor: 'bg-muted', textColor: 'text-muted-foreground', borderColor: 'border-border' },
  { name: 'Teams', color: 'bg-pink-500', bgColor: 'bg-pink-500/10', textColor: 'text-pink-600', borderColor: 'border-pink-500/20' },
  { name: 'Content', color: 'bg-violet-500', bgColor: 'bg-violet-500/10', textColor: 'text-violet-600', borderColor: 'border-violet-500/20' },
] as const

export function clusterColor(clusterName: string): {
  color: string
  bgColor: string
  textColor: string
  borderColor: string
} {
  const cluster = CLUSTER_PALETTE.find(c => c.name === clusterName)
  return cluster ?? {
    color: 'bg-muted-foreground',
    bgColor: 'bg-muted',
    textColor: 'text-muted-foreground',
    borderColor: 'border-border',
  }
}

// ---------------------------------------------------------------------------
// API Key Provider Colors
// ---------------------------------------------------------------------------

export const API_KEY_PROVIDER_COLORS: Record<string, string> = {
  anthropic: 'bg-orange-500/10',
  voyage: 'bg-blue-500/10',
  openai: 'bg-green-500/10',
  firecrawl: 'bg-purple-500/10',
}

export function apiKeyProviderColor(provider: string): string {
  return API_KEY_PROVIDER_COLORS[provider.toLowerCase()] ?? 'bg-muted'
}
