/**
 * DataSourcesGrid Component
 *
 * Displays the data sources configured for the project.
 * Shows website, OpenAPI schema, help center, and documentation status.
 * Clicking a source opens a detail sheet with more information.
 */

'use client'

import { useState, useCallback } from 'react'
import { GitHubSchemaSourceSheet, type ParsedSchemaResult } from '@/components/schema'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Globe,
  FileJson,
  FileText,
  Check,
  AlertCircle,
  Clock,
  Plus,
  ExternalLink,
  RefreshCw,
  Calendar,
  Link2,
  Sparkles,
  ChevronDown,
  Users,
  Lightbulb,
  Target,
  Loader2,
  Zap,
  Route,
  Code2,
  GitBranch,
} from 'lucide-react'
import type { ProjectSource } from '@/lib/api-client/projects'
import { useAnalyzeSource, type SourceAnalysis, type SourceContribution } from '@/hooks/use-sources'

interface SchemaInfo {
  version?: string | null
  modelCount: number
  endpointCount: number
  rawSchema?: unknown // Full schema object for display
}

interface CodebaseSchemaInfo {
  repository?: { owner: string; name: string; branch: string } | null
  modelCount?: number
  format?: string
}

interface DataSourcesGridProps {
  projectId: string
  sources?: ProjectSource[]
  schema?: SchemaInfo | null
  codebaseSchema?: CodebaseSchemaInfo | null
  onAddSource?: () => void
  onEditSource?: (source: ProjectSource) => void
  onViewSchema?: () => void
  onCodebaseSchemaImported?: () => void
  loading?: boolean
}

// Source type configuration
const SOURCE_CONFIG: Record<
  ProjectSource['type'],
  {
    icon: React.ComponentType<{ className?: string }>
    label: string
    description: string
  }
> = {
  website: {
    icon: Globe,
    label: 'Website',
    description: 'Product website for context',
  },
  readme: {
    icon: FileText,
    label: 'README',
    description: 'Project readme content',
  },
  documentation: {
    icon: FileText,
    label: 'Documentation',
    description: 'API or technical documentation',
  },
}

function getStatusBadge(status?: string | null, error?: string | null) {
  if (error) {
    return (
      <Badge variant="destructive" className="gap-1 text-xs">
        <AlertCircle className="h-3 w-3" />
        Failed
      </Badge>
    )
  }

  switch (status) {
    case 'completed':
      return (
        <Badge variant="outline" className="gap-1 text-xs text-green-600 border-green-600/30">
          <Check className="h-3 w-3" />
          Synced
        </Badge>
      )
    case 'fetching':
      return (
        <Badge variant="outline" className="gap-1 text-xs">
          <Clock className="h-3 w-3 animate-spin" />
          Syncing
        </Badge>
      )
    case 'pending':
      return (
        <Badge variant="outline" className="gap-1 text-xs text-yellow-600 border-yellow-600/30">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      )
    default:
      return null
  }
}

function formatTimeAgo(dateString?: string | null): string {
  if (!dateString) return ''

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

interface SourceRowProps {
  source?: ProjectSource
  config: typeof SOURCE_CONFIG[keyof typeof SOURCE_CONFIG]
  onAdd?: () => void
  onClick?: (source: ProjectSource) => void
}

function getStatusIndicator(status?: string | null, error?: string | null) {
  if (error) {
    return <AlertCircle className="h-3.5 w-3.5 text-destructive" />
  }
  switch (status) {
    case 'completed':
      return <Check className="h-3.5 w-3.5 text-green-600" />
    case 'fetching':
      return <Clock className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
    case 'pending':
      return <Clock className="h-3.5 w-3.5 text-yellow-600" />
    default:
      return null
  }
}

function SourceRow({ source, config, onAdd, onClick }: SourceRowProps) {
  const Icon = config.icon
  const hasSource = !!source

  // Get contribution counts for inline display
  const contributions = (source as ProjectSource & { contributions?: { entityType: string }[] })?.contributions || []
  const featureCount = contributions.filter(c => c.entityType === 'feature').length
  const journeyCount = contributions.filter(c => c.entityType === 'journey').length

  if (!hasSource) {
    return (
      <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-3">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{config.label}</span>
          <span className="text-xs text-muted-foreground">Not configured</span>
        </div>
        <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={onAdd}>
          <Plus className="h-3 w-3" />
          Add
        </Button>
      </div>
    )
  }

  const isSynced = source.fetchStatus === 'completed' && !source.fetchError

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 transition-colors cursor-pointer ${
        isSynced ? 'bg-green-500/5 hover:bg-green-500/10' : 'hover:bg-muted/30'
      }`}
      onClick={() => onClick?.(source)}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Icon className={`h-4 w-4 shrink-0 ${isSynced ? 'text-green-600' : 'text-primary'}`} />
        <span className="text-sm font-medium">{config.label}</span>
        <div className="flex items-center gap-1.5">
          {getStatusIndicator(source.fetchStatus, source.fetchError)}
          <span className="text-xs text-muted-foreground">
            {source.fetchError ? 'Failed' : source.fetchStatus === 'completed' ? 'Synced' : source.fetchStatus === 'fetching' ? 'Syncing' : 'Pending'}
          </span>
        </div>
        {source.url && (
          <span className="text-xs text-muted-foreground truncate max-w-[150px]">
            {new URL(source.url).hostname}
          </span>
        )}
        {(featureCount > 0 || journeyCount > 0) && (
          <Badge variant="secondary" className="text-xs gap-1">
            <Zap className="h-3 w-3" />
            {featureCount + journeyCount} linked
          </Badge>
        )}
      </div>
      <ChevronDown className="h-4 w-4 text-muted-foreground -rotate-90 shrink-0" />
    </div>
  )
}

interface SchemaRowProps {
  schema?: SchemaInfo | null
  onClick?: () => void
  onAdd?: () => void
}

function SchemaRow({ schema, onClick, onAdd }: SchemaRowProps) {
  if (!schema) {
    return (
      <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-3">
          <FileJson className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">OpenAPI Schema</span>
          <span className="text-xs text-muted-foreground">Required for fixtures</span>
        </div>
        <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={onAdd}>
          <Plus className="h-3 w-3" />
          Upload
        </Button>
      </div>
    )
  }

  return (
    <div
      className="flex items-center justify-between px-4 py-3 bg-green-500/5 hover:bg-green-500/10 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <FileJson className="h-4 w-4 text-green-600 shrink-0" />
        <span className="text-sm font-medium">OpenAPI Schema</span>
        <div className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-green-600" />
          <span className="text-xs text-green-600">Loaded</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {schema.endpointCount} endpoints, {schema.modelCount} models
        </span>
      </div>
      <ChevronDown className="h-4 w-4 text-muted-foreground -rotate-90 shrink-0" />
    </div>
  )
}

// Format a date string to a readable format
function formatDate(dateString?: string | null): string {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface SourceDetailSheetProps {
  projectId: string
  source: ProjectSource | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

/**
 * Component to display AI analysis results
 */
function AnalysisSection({ analysis }: { analysis: SourceAnalysis }) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center justify-between w-full p-3 rounded-lg border bg-gradient-to-r from-purple-500/5 to-blue-500/5 hover:from-purple-500/10 hover:to-blue-500/10 transition-colors">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium">AI Analysis</span>
            <Badge variant="outline" className="text-xs">
              {Math.round(analysis.confidence * 100)}% confidence
            </Badge>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 space-y-4">
        {/* Product Info */}
        {(analysis.productName || analysis.companyName) && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Product</p>
            <p className="text-sm">
              {analysis.productName}
              {analysis.companyName && <span className="text-muted-foreground"> by {analysis.companyName}</span>}
            </p>
          </div>
        )}

        {/* Summary */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Summary</p>
          <p className="text-sm text-muted-foreground">{analysis.summary}</p>
        </div>

        {/* Target Audience */}
        {analysis.targetAudience.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">Target Audience</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {analysis.targetAudience.map((audience, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {audience}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Value Propositions */}
        {analysis.valuePropositions.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Target className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">Value Propositions</p>
            </div>
            <ul className="space-y-1">
              {analysis.valuePropositions.slice(0, 4).map((prop, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-green-600 mt-0.5">•</span>
                  {prop}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Key Insights */}
        {analysis.keyInsights.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">Key Insights</p>
            </div>
            <ul className="space-y-1">
              {analysis.keyInsights.slice(0, 3).map((insight, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-yellow-600 mt-0.5">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Mentioned Features */}
        {analysis.mentionedFeatures.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">Mentioned Features</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {analysis.mentionedFeatures.slice(0, 6).map((feature, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {feature}
                </Badge>
              ))}
              {analysis.mentionedFeatures.length > 6 && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  +{analysis.mentionedFeatures.length - 6} more
                </Badge>
              )}
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          Analyzed {new Date(analysis.analyzedAt).toLocaleDateString()}
        </p>
      </CollapsibleContent>
    </Collapsible>
  )
}

/**
 * Component to display linked features/journeys
 */
function ContributionsSection({ contributions }: { contributions: SourceContribution[] }) {
  if (contributions.length === 0) return null

  const featureContributions = contributions.filter(c => c.entityType === 'feature')
  const journeyContributions = contributions.filter(c => c.entityType === 'journey')

  return (
    <div className="space-y-4">
      {featureContributions.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="h-3.5 w-3.5 text-blue-600" />
            <p className="text-xs font-medium text-muted-foreground">Linked Features ({featureContributions.length})</p>
          </div>
          <div className="space-y-1.5">
            {featureContributions.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2 rounded-md border bg-blue-500/5 hover:bg-blue-500/10 cursor-pointer transition-colors"
              >
                <span className="text-sm">{c.entityName || 'Feature'}</span>
                <Badge variant="outline" className="text-[10px]">
                  {Math.round((c.confidence || 0) * 100)}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {journeyContributions.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Route className="h-3.5 w-3.5 text-green-600" />
            <p className="text-xs font-medium text-muted-foreground">Linked Journeys ({journeyContributions.length})</p>
          </div>
          <div className="space-y-1.5">
            {journeyContributions.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2 rounded-md border bg-green-500/5 hover:bg-green-500/10 cursor-pointer transition-colors"
              >
                <span className="text-sm">{c.entityName || 'Journey'}</span>
                <Badge variant="outline" className="text-[10px]">
                  {Math.round((c.confidence || 0) * 100)}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SourceDetailSheet({
  projectId,
  source,
  open,
  onOpenChange,
  onEdit,
}: SourceDetailSheetProps) {
  const analyzeSourceMutation = useAnalyzeSource()

  const handleAnalyze = useCallback(() => {
    if (!source) return
    analyzeSourceMutation.mutate({
      projectId,
      sourceId: source.id,
      refetch: false,
    })
  }, [source, projectId, analyzeSourceMutation])

  const handleRefetch = useCallback(() => {
    if (!source) return
    analyzeSourceMutation.mutate({
      projectId,
      sourceId: source.id,
      refetch: true,
    })
  }, [source, projectId, analyzeSourceMutation])

  if (!source) return null

  const config = SOURCE_CONFIG[source.type]
  const Icon = config.icon

  // Parse analysis from extractedContent
  const analysis = source.extractedContent as SourceAnalysis | null
  const hasAnalysis = analysis && 'analyzedAt' in analysis && 'summary' in analysis
  const contributions = (source as ProjectSource & { contributions?: SourceContribution[] }).contributions || []

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" open={open} className="sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle>{config.label}</SheetTitle>
              <SheetDescription>{config.description}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {/* Status */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Status</p>
            <div className="flex items-center gap-2">
              {getStatusBadge(source.fetchStatus, source.fetchError)}
              {source.fetchError && (
                <p className="text-xs text-destructive">{source.fetchError}</p>
              )}
            </div>
          </div>

          {/* URL */}
          {source.url && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Source URL</p>
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline truncate"
                >
                  {source.url}
                </a>
                <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
              </div>
            </div>
          )}

          {/* Last fetched */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Last Synced</p>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(source.lastFetchedAt)}</span>
              {source.lastFetchedAt && (
                <span className="text-xs text-muted-foreground">
                  ({formatTimeAgo(source.lastFetchedAt)})
                </span>
              )}
            </div>
          </div>

          {/* AI Analysis Section */}
          {hasAnalysis ? (
            <AnalysisSection analysis={analysis as SourceAnalysis} />
          ) : (
            <div className="p-4 rounded-lg border border-dashed bg-muted/20 text-center">
              <Sparkles className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                No AI analysis yet
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAnalyze}
                disabled={analyzeSourceMutation.isPending || !source.content}
              >
                {analyzeSourceMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    Analyze with AI
                  </>
                )}
              </Button>
              {!source.content && (
                <p className="text-xs text-muted-foreground mt-2">
                  Fetch content first to enable analysis
                </p>
              )}
            </div>
          )}

          {/* Linked Features/Journeys */}
          {contributions.length > 0 && (
            <ContributionsSection contributions={contributions} />
          )}

          {/* Content preview (collapsed by default now) */}
          {source.content && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full text-left">
                  <p className="text-xs font-medium text-muted-foreground">
                    Content Preview ({source.content.length.toLocaleString()} chars)
                  </p>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-3 rounded-lg border bg-muted/30 max-h-48 overflow-y-auto mt-2">
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-12">
                    {source.content.slice(0, 1000)}
                    {source.content.length > 1000 && '...'}
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        <SheetFooter className="border-t">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleRefetch}
              disabled={analyzeSourceMutation.isPending}
            >
              {analyzeSourceMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Re-fetch
            </Button>
            {hasAnalysis ? (
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleAnalyze}
                disabled={analyzeSourceMutation.isPending}
              >
                <Sparkles className="h-4 w-4" />
                Re-analyze
              </Button>
            ) : null}
            <Button className="flex-1" onClick={onEdit}>
              Edit Source
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

interface CodebaseSchemaRowProps {
  hasCodebaseSchema: boolean
  repoInfo?: { owner: string; name: string; branch: string } | null
  modelCount?: number
  onClick?: () => void
  onAdd?: () => void
}

function CodebaseSchemaRow({
  hasCodebaseSchema,
  repoInfo,
  modelCount,
  onClick,
  onAdd,
}: CodebaseSchemaRowProps) {
  if (!hasCodebaseSchema) {
    return (
      <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-3">
          <Code2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Codebase Schema</span>
          <span className="text-xs text-muted-foreground">Import from GitHub</span>
        </div>
        <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={onAdd}>
          <Plus className="h-3 w-3" />
          Import
        </Button>
      </div>
    )
  }

  return (
    <div
      className="flex items-center justify-between px-4 py-3 bg-blue-500/5 hover:bg-blue-500/10 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Code2 className="h-4 w-4 text-blue-600 shrink-0" />
        <span className="text-sm font-medium">Codebase Schema</span>
        <div className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-blue-600" />
          <span className="text-xs text-blue-600">Imported</span>
        </div>
        {repoInfo && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <GitBranch className="h-3 w-3" />
            <span className="truncate max-w-[150px]">
              {repoInfo.owner}/{repoInfo.name}
            </span>
          </div>
        )}
        {modelCount !== undefined && modelCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {modelCount} models
          </Badge>
        )}
      </div>
      <ChevronDown className="h-4 w-4 text-muted-foreground -rotate-90 shrink-0" />
    </div>
  )
}

interface SchemaDetailSheetProps {
  schema: SchemaInfo | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onViewSchema?: () => void
}

function SchemaDetailSheet({
  schema,
  open,
  onOpenChange,
  onViewSchema,
}: SchemaDetailSheetProps) {
  if (!schema) return null

  // Format schema as JSON string
  const schemaJson = schema.rawSchema
    ? JSON.stringify(schema.rawSchema, null, 2)
    : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" open={open} className="sm:max-w-2xl">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <FileJson className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <SheetTitle>OpenAPI Schema</SheetTitle>
              <SheetDescription>API specification for this project</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {/* Status and Version row */}
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="gap-1 text-xs text-green-600 border-green-600/30">
              <Check className="h-3 w-3" />
              Loaded
            </Badge>
            {schema.version && (
              <span className="text-sm text-muted-foreground">v{schema.version}</span>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-muted/30">
              <p className="text-2xl font-semibold">{schema.endpointCount}</p>
              <p className="text-xs text-muted-foreground">API Endpoints</p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30">
              <p className="text-2xl font-semibold">{schema.modelCount}</p>
              <p className="text-xs text-muted-foreground">Data Models</p>
            </div>
          </div>

          {/* Schema code block */}
          {schemaJson && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Schema Definition</p>
              <div className="relative">
                <pre className="p-4 rounded-lg border bg-zinc-950 text-zinc-100 text-xs font-mono overflow-auto max-h-[400px]">
                  <code>{schemaJson}</code>
                </pre>
              </div>
            </div>
          )}

          {!schemaJson && (
            <div className="p-4 rounded-lg border border-dashed bg-muted/20">
              <p className="text-sm text-muted-foreground">
                The OpenAPI schema defines your API endpoints and data models.
                DemoKit uses this to generate realistic fixture data that matches your API structure.
              </p>
            </div>
          )}
        </div>

        <SheetFooter className="border-t">
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {onViewSchema && (
              <Button className="flex-1" onClick={onViewSchema}>
                View in Schema Tab
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function DataSourcesGrid({
  projectId,
  sources = [],
  schema,
  codebaseSchema,
  onAddSource,
  onEditSource,
  onViewSchema,
  onCodebaseSchemaImported,
  loading = false,
}: DataSourcesGridProps) {
  const [selectedSource, setSelectedSource] = useState<ProjectSource | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [schemaSheetOpen, setSchemaSheetOpen] = useState(false)
  const [codebaseSchemaSheetOpen, setCodebaseSchemaSheetOpen] = useState(false)

  const handleSourceClick = (source: ProjectSource) => {
    setSelectedSource(source)
    setSheetOpen(true)
  }

  const handleEditFromSheet = () => {
    if (selectedSource && onEditSource) {
      setSheetOpen(false)
      onEditSource(selectedSource)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Data Sources</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            <Skeleton className="h-12 mx-4 my-3" />
            <Skeleton className="h-12 mx-4 my-3" />
            <Skeleton className="h-12 mx-4 my-3" />
            <Skeleton className="h-12 mx-4 my-3" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Find sources by type
  const sourceByType = sources.reduce((acc, source) => {
    acc[source.type] = source
    return acc
  }, {} as Record<string, ProjectSource>)

  const handleCodebaseSchemaImported = (_result: ParsedSchemaResult) => {
    setCodebaseSchemaSheetOpen(false)
    onCodebaseSchemaImported?.()
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Data Sources</CardTitle>
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={onAddSource}>
            <Plus className="h-3 w-3" />
            Add Source
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {/* Schema row - always first */}
          <SchemaRow
            schema={schema}
            onClick={() => setSchemaSheetOpen(true)}
            onAdd={onAddSource}
          />

          {/* Codebase schema row */}
          <CodebaseSchemaRow
            hasCodebaseSchema={!!codebaseSchema}
            repoInfo={codebaseSchema?.repository}
            modelCount={codebaseSchema?.modelCount}
            onClick={() => setCodebaseSchemaSheetOpen(true)}
            onAdd={() => setCodebaseSchemaSheetOpen(true)}
          />

          {/* Website source */}
          <SourceRow
            source={sourceByType['website']}
            config={SOURCE_CONFIG.website}
            onAdd={onAddSource}
            onClick={handleSourceClick}
          />

          {/* Documentation source */}
          <SourceRow
            source={sourceByType['documentation'] || sourceByType['readme']}
            config={SOURCE_CONFIG.documentation}
            onAdd={onAddSource}
            onClick={handleSourceClick}
          />
        </div>

        {/* Source detail sheet */}
        <SourceDetailSheet
          projectId={projectId}
          source={selectedSource}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          onEdit={handleEditFromSheet}
        />

        {/* Schema detail sheet */}
        <SchemaDetailSheet
          schema={schema || null}
          open={schemaSheetOpen}
          onOpenChange={setSchemaSheetOpen}
          onViewSchema={onViewSchema}
        />

        {/* Codebase schema import sheet */}
        <GitHubSchemaSourceSheet
          projectId={projectId}
          open={codebaseSchemaSheetOpen}
          onOpenChange={setCodebaseSchemaSheetOpen}
          onImportComplete={handleCodebaseSchemaImported}
        />
      </CardContent>
    </Card>
  )
}
