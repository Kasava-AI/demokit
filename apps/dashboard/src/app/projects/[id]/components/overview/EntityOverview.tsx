/**
 * EntityOverview Component
 *
 * Displays a mini entity relationship visualization for the overview page.
 * Shows core models with their connections.
 * Supports click-to-select for viewing model relationships, schema, and fixtures.
 */

'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Database,
  ChevronRight,
  ArrowRight,
  ArrowRightLeft,
  X,
  FileJson,
  Braces,
  Layers,
  Maximize2,
} from 'lucide-react'
import { SchemaExplorerSheet } from '@/components/schema/SchemaExplorerSheet'

interface Relationship {
  source: string
  target: string
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many'
}

interface Cluster {
  name: string
  models: string[]
  color: string
}

// Auto-detect clusters based on naming patterns
function detectClusters(models: string[]): Cluster[] {
  const clusterMap = new Map<string, Set<string>>()

  // Common prefixes to detect
  const prefixPatterns = [
    { pattern: /^(user|profile|auth|account)/i, name: 'Auth' },
    { pattern: /^(order|cart|checkout|payment)/i, name: 'Orders' },
    { pattern: /^(product|item|inventory|catalog)/i, name: 'Products' },
    { pattern: /^(github|linear|asana|jira)/i, name: 'Integrations' },
    { pattern: /^(log|event|metric|analytics)/i, name: 'Analytics' },
    { pattern: /^(config|setting|preference)/i, name: 'Config' },
    { pattern: /^(team|org|member|role)/i, name: 'Teams' },
    { pattern: /^(doc|content|page|post)/i, name: 'Content' },
  ]

  // Cluster colors (muted, accessible)
  const clusterColors: Record<string, string> = {
    'Auth': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    'Orders': 'bg-green-500/10 text-green-600 border-green-500/20',
    'Products': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    'Integrations': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    'Analytics': 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
    'Config': 'bg-slate-500/10 text-slate-600 border-slate-500/20',
    'Teams': 'bg-pink-500/10 text-pink-600 border-pink-500/20',
    'Content': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    'Other': 'bg-muted text-muted-foreground border-muted',
  }

  // Assign models to clusters based on naming
  models.forEach((model) => {
    let assigned = false
    for (const { pattern, name } of prefixPatterns) {
      if (pattern.test(model)) {
        if (!clusterMap.has(name)) {
          clusterMap.set(name, new Set())
        }
        clusterMap.get(name)!.add(model)
        assigned = true
        break
      }
    }
    if (!assigned) {
      if (!clusterMap.has('Other')) {
        clusterMap.set('Other', new Set())
      }
      clusterMap.get('Other')!.add(model)
    }
  })

  // Convert to array and filter empty clusters
  return Array.from(clusterMap.entries())
    .filter(([_, modelSet]) => modelSet.size > 0)
    .map(([name, modelSet]) => ({
      name,
      models: Array.from(modelSet),
      color: clusterColors[name] || clusterColors['Other'],
    }))
    .sort((a, b) => b.models.length - a.models.length)
}

interface PropertyDef {
  name: string
  type: string
  format?: string
  description?: string
  required?: boolean
  nullable?: boolean
  enum?: unknown[]
  example?: unknown
}

interface ModelSchema {
  name: string
  type: string
  description?: string
  properties?: Record<string, PropertyDef>
  required?: string[]
  example?: unknown
}

interface EntityOverviewProps {
  models: string[]
  relationships?: Relationship[]
  modelSchemas?: Record<string, ModelSchema>
  fixtureData?: Record<string, unknown[]>
  maxVisible?: number
  onViewSchema?: () => void
  projectId?: string
  loading?: boolean
}

// Calculate which models to show (prioritize those with most relationships)
function getTopModels(
  models: string[],
  relationships: Relationship[],
  maxVisible: number
): string[] {
  // Count relationships for each model
  const relationshipCount = new Map<string, number>()
  models.forEach((m) => relationshipCount.set(m, 0))

  relationships.forEach((rel) => {
    relationshipCount.set(
      rel.source,
      (relationshipCount.get(rel.source) || 0) + 1
    )
    relationshipCount.set(
      rel.target,
      (relationshipCount.get(rel.target) || 0) + 1
    )
  })

  // Sort by relationship count (descending) and take top N
  return [...models]
    .sort((a, b) => (relationshipCount.get(b) || 0) - (relationshipCount.get(a) || 0))
    .slice(0, maxVisible)
}

interface ModelNodeProps {
  name: string
  isSelected?: boolean
  onClick?: () => void
}

function ModelNode({ name, isSelected, onClick }: ModelNodeProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-2 rounded-lg border text-center transition-all cursor-pointer
        ${isSelected
          ? 'bg-primary border-primary ring-2 ring-primary/20'
          : 'bg-muted/50 border-muted hover:bg-muted'
        }
      `}
    >
      <div className="flex items-center gap-1.5 justify-center">
        <Database className={`h-3 w-3 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
        <span className={`text-xs font-medium ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
          {name}
        </span>
      </div>
    </button>
  )
}

interface RelationshipLineProps {
  label?: string
  hasRelationship?: boolean
}

function RelationshipLine({ label, hasRelationship = false }: RelationshipLineProps) {
  // Only show a visual connection if there's an actual relationship
  if (!hasRelationship) {
    return (
      <div className="flex items-center justify-center px-1">
        <div className="w-4 h-px bg-muted-foreground/15" />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-0.5">
      {label && (
        <span className="text-[10px] font-medium text-muted-foreground/70 tabular-nums">
          {label}
        </span>
      )}
      <div className="flex items-center justify-center">
        <div className="w-6 h-px bg-muted-foreground/30" />
        <ArrowRight className="h-3 w-3 text-muted-foreground/50 -mx-1" />
        <div className="w-6 h-px bg-muted-foreground/30" />
      </div>
    </div>
  )
}

// Relationship type labels
const RELATIONSHIP_LABELS: Record<string, string> = {
  'one-to-one': '1:1',
  'one-to-many': '1:n',
  'many-to-one': 'n:1',
  'many-to-many': 'n:n',
}

// Mini-graph visualization for showing a model's relationships
interface MiniGraphProps {
  modelName: string
  outgoingRels: Relationship[]
  incomingRels: Relationship[]
  onModelClick?: (model: string) => void
}

function MiniGraph({ modelName, outgoingRels, incomingRels, onModelClick }: MiniGraphProps) {
  const incomingModels = incomingRels.map(r => ({ name: r.source, type: r.type }))
  const outgoingModels = outgoingRels.map(r => ({ name: r.target, type: r.type }))

  // SVG dimensions
  const width = 320
  const height = Math.max(120, Math.max(incomingModels.length, outgoingModels.length) * 40 + 40)
  const centerX = width / 2
  const centerY = height / 2
  const nodeWidth = 80
  const nodeHeight = 28

  // Position calculations
  const leftX = 30
  const rightX = width - 30 - nodeWidth

  return (
    <div className="w-full overflow-hidden rounded-lg bg-muted/30 p-2">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Incoming connections (left side) */}
        {incomingModels.map((model, i) => {
          const y = incomingModels.length === 1
            ? centerY
            : 20 + (i * (height - 40) / Math.max(1, incomingModels.length - 1))
          return (
            <g key={`in-${model.name}`}>
              {/* Connection line */}
              <path
                d={`M ${leftX + nodeWidth} ${y} Q ${centerX - 30} ${y}, ${centerX - nodeWidth / 2} ${centerY}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-muted-foreground/40"
                markerEnd="url(#arrowhead)"
              />
              {/* Cardinality label */}
              <text
                x={leftX + nodeWidth + 8}
                y={y - 6}
                className="fill-muted-foreground text-[9px] font-medium"
              >
                {RELATIONSHIP_LABELS[model.type] || model.type}
              </text>
              {/* Source node */}
              <g
                className="cursor-pointer"
                onClick={() => onModelClick?.(model.name)}
              >
                <rect
                  x={leftX}
                  y={y - nodeHeight / 2}
                  width={nodeWidth}
                  height={nodeHeight}
                  rx={6}
                  className="fill-background stroke-border hover:stroke-primary transition-colors"
                  strokeWidth="1.5"
                />
                <text
                  x={leftX + nodeWidth / 2}
                  y={y + 4}
                  textAnchor="middle"
                  className="fill-foreground text-[10px] font-medium pointer-events-none"
                >
                  {model.name.length > 10 ? model.name.slice(0, 9) + '…' : model.name}
                </text>
              </g>
            </g>
          )
        })}

        {/* Center node (selected model) */}
        <g>
          <rect
            x={centerX - nodeWidth / 2}
            y={centerY - nodeHeight / 2}
            width={nodeWidth}
            height={nodeHeight}
            rx={6}
            className="fill-primary stroke-primary"
            strokeWidth="2"
          />
          <text
            x={centerX}
            y={centerY + 4}
            textAnchor="middle"
            className="fill-primary-foreground text-[10px] font-semibold"
          >
            {modelName.length > 10 ? modelName.slice(0, 9) + '…' : modelName}
          </text>
        </g>

        {/* Outgoing connections (right side) */}
        {outgoingModels.map((model, i) => {
          const y = outgoingModels.length === 1
            ? centerY
            : 20 + (i * (height - 40) / Math.max(1, outgoingModels.length - 1))
          return (
            <g key={`out-${model.name}`}>
              {/* Connection line */}
              <path
                d={`M ${centerX + nodeWidth / 2} ${centerY} Q ${centerX + 30} ${y}, ${rightX} ${y}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-muted-foreground/40"
                markerEnd="url(#arrowhead)"
              />
              {/* Cardinality label */}
              <text
                x={rightX - 8}
                y={y - 6}
                textAnchor="end"
                className="fill-muted-foreground text-[9px] font-medium"
              >
                {RELATIONSHIP_LABELS[model.type] || model.type}
              </text>
              {/* Target node */}
              <g
                className="cursor-pointer"
                onClick={() => onModelClick?.(model.name)}
              >
                <rect
                  x={rightX}
                  y={y - nodeHeight / 2}
                  width={nodeWidth}
                  height={nodeHeight}
                  rx={6}
                  className="fill-background stroke-border hover:stroke-primary transition-colors"
                  strokeWidth="1.5"
                />
                <text
                  x={rightX + nodeWidth / 2}
                  y={y + 4}
                  textAnchor="middle"
                  className="fill-foreground text-[10px] font-medium pointer-events-none"
                >
                  {model.name.length > 10 ? model.name.slice(0, 9) + '…' : model.name}
                </text>
              </g>
            </g>
          )
        })}

        {/* Arrow marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M 0 0 L 6 3 L 0 6 z" className="fill-muted-foreground/40" />
          </marker>
        </defs>
      </svg>

      {/* Empty state */}
      {incomingModels.length === 0 && outgoingModels.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">No connections</p>
        </div>
      )}
    </div>
  )
}

interface ModelDetailPanelProps {
  modelName: string
  relationships: Relationship[]
  modelSchema?: ModelSchema
  fixtureData?: unknown[]
  onClose: () => void
  onModelClick?: (model: string) => void
  onExploreSchema?: () => void
}

function ModelDetailPanel({ modelName, relationships, modelSchema, fixtureData, onClose, onModelClick, onExploreSchema }: ModelDetailPanelProps) {
  // Get relationships involving this model
  const outgoingRels = relationships.filter((r) => r.source === modelName)
  const incomingRels = relationships.filter((r) => r.target === modelName)

  // Get properties from schema
  const properties = modelSchema?.properties ? Object.values(modelSchema.properties) : []
  const requiredFields = new Set(modelSchema?.required || [])

  return (
    <div className="mt-4 p-4 rounded-lg border bg-muted/30 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <span className="font-medium">{modelName}</span>
          {modelSchema?.description && (
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
              — {modelSchema.description}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="schema" className="w-full">
        <TabsList className="h-8 mb-3">
          <TabsTrigger value="schema" className="text-xs gap-1.5 h-7">
            <Braces className="h-3 w-3" />
            Schema
          </TabsTrigger>
          <TabsTrigger value="relationships" className="text-xs gap-1.5 h-7">
            <ArrowRightLeft className="h-3 w-3" />
            Relations
          </TabsTrigger>
          <TabsTrigger value="fixtures" className="text-xs gap-1.5 h-7">
            <FileJson className="h-3 w-3" />
            Fixtures
          </TabsTrigger>
        </TabsList>

        {/* Schema Tab */}
        <TabsContent value="schema" className="mt-0">
          {properties.length > 0 ? (
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {properties.map((prop) => (
                <div key={prop.name} className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-muted/50">
                  <span className="font-mono text-xs">{prop.name}</span>
                  {requiredFields.has(prop.name) && (
                    <span className="text-[10px] text-destructive">*</span>
                  )}
                  <Badge variant="secondary" className="text-[10px] ml-auto">
                    {prop.format || prop.type}
                  </Badge>
                  {prop.nullable && (
                    <Badge variant="outline" className="text-[10px]">
                      null
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No schema available
            </p>
          )}
        </TabsContent>

        {/* Relationships Tab */}
        <TabsContent value="relationships" className="mt-0">
          <div className="space-y-3">
            {/* Mini-graph visualization */}
            {(outgoingRels.length > 0 || incomingRels.length > 0) && (
              <MiniGraph
                modelName={modelName}
                outgoingRels={outgoingRels}
                incomingRels={incomingRels}
                onModelClick={onModelClick}
              />
            )}

            {/* Relationship lists */}
            <div className="grid grid-cols-2 gap-4">
              {/* Outgoing relationships */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  References ({outgoingRels.length})
                </p>
                <div className="space-y-1">
                  {outgoingRels.length > 0 ? (
                    outgoingRels.map((rel, i) => (
                      <button
                        key={i}
                        className="flex items-center gap-2 text-sm w-full hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
                        onClick={() => onModelClick?.(rel.target)}
                      >
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate">{rel.target}</span>
                        <Badge variant="outline" className="text-[10px] ml-auto shrink-0">
                          {RELATIONSHIP_LABELS[rel.type] || rel.type}
                        </Badge>
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">None</p>
                  )}
                </div>
              </div>

              {/* Incoming relationships */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  Referenced By ({incomingRels.length})
                </p>
                <div className="space-y-1">
                  {incomingRels.length > 0 ? (
                    incomingRels.map((rel, i) => (
                      <button
                        key={i}
                        className="flex items-center gap-2 text-sm w-full hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
                        onClick={() => onModelClick?.(rel.source)}
                      >
                        <ArrowRight className="h-3 w-3 text-muted-foreground rotate-180" />
                        <span className="truncate">{rel.source}</span>
                        <Badge variant="outline" className="text-[10px] ml-auto shrink-0">
                          {RELATIONSHIP_LABELS[rel.type] || rel.type}
                        </Badge>
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">None</p>
                  )}
                </div>
              </div>
            </div>

            {/* No relationships */}
            {outgoingRels.length === 0 && incomingRels.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No relationships detected
              </p>
            )}

            {/* Explore full graph button */}
            {onExploreSchema && (outgoingRels.length > 0 || incomingRels.length > 0) && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 mt-2"
                onClick={onExploreSchema}
              >
                <Maximize2 className="h-3.5 w-3.5" />
                Explore Full Schema
              </Button>
            )}
          </div>
        </TabsContent>

        {/* Fixtures Tab */}
        <TabsContent value="fixtures" className="mt-0">
          {fixtureData && fixtureData.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">
                {fixtureData.length} record{fixtureData.length !== 1 ? 's' : ''}
              </p>
              <div className="max-h-[180px] overflow-y-auto">
                <pre className="text-xs font-mono bg-muted/50 p-2 rounded overflow-x-auto">
                  {JSON.stringify(fixtureData.slice(0, 3), null, 2)}
                </pre>
              </div>
              {fixtureData.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  ...and {fixtureData.length - 3} more
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No fixture data available
            </p>
          )}
        </TabsContent>
      </Tabs>

      {/* Summary footer */}
      <div className="pt-3 mt-3 border-t flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Braces className="h-3 w-3" />
          <span>{properties.length} fields</span>
        </div>
        <div className="flex items-center gap-1">
          <ArrowRightLeft className="h-3 w-3" />
          <span>{outgoingRels.length + incomingRels.length} connections</span>
        </div>
        {fixtureData && (
          <div className="flex items-center gap-1">
            <FileJson className="h-3 w-3" />
            <span>{fixtureData.length} records</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function EntityOverview({
  models,
  relationships = [],
  modelSchemas,
  fixtureData,
  maxVisible = 5,
  onViewSchema,
  projectId,
  loading = false,
}: EntityOverviewProps) {
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [schemaExplorerOpen, setSchemaExplorerOpen] = useState(false)

  const visibleModels = useMemo(
    () => getTopModels(models, relationships, maxVisible),
    [models, relationships, maxVisible]
  )

  // Detect clusters from model names
  const clusters = useMemo(
    () => detectClusters(models),
    [models]
  )

  // Create a lookup for relationship labels between adjacent visible models
  const getRelationshipLabel = useMemo(() => {
    const lookup = new Map<string, string>()
    relationships.forEach((rel) => {
      // Store both directions for lookup
      lookup.set(`${rel.source}->${rel.target}`, RELATIONSHIP_LABELS[rel.type] || rel.type)
      // Reverse label for opposite direction
      const reverseType = rel.type === 'one-to-many' ? 'many-to-one'
        : rel.type === 'many-to-one' ? 'one-to-many'
        : rel.type
      lookup.set(`${rel.target}->${rel.source}`, RELATIONSHIP_LABELS[reverseType] || reverseType)
    })
    return (from: string, to: string) => lookup.get(`${from}->${to}`)
  }, [relationships])

  // Handle clicking on a model (toggle selection, or navigate to new model)
  const handleModelClick = (model: string) => {
    if (models.includes(model)) {
      setSelectedModel(selectedModel === model ? null : model)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Entity Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4 py-4">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-1 w-8" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-1 w-8" />
            <Skeleton className="h-10 w-20" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (models.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Entity Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <Database className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No models detected yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload an OpenAPI schema to see entities
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const remainingCount = models.length - visibleModels.length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Entity Overview
          </CardTitle>
          {onViewSchema && (
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={onViewSchema}>
              View Schema
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Simple linear layout for now - could be upgraded to a proper graph visualization */}
        <div className="py-2">
          {/* Model nodes in a flex row with relationship indicators */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {visibleModels.map((model, index) => (
              <div key={model} className="flex items-center gap-2">
                <ModelNode
                  name={model}
                  isSelected={selectedModel === model}
                  onClick={() => handleModelClick(model)}
                />
                {index < visibleModels.length - 1 && (
                  <RelationshipLine
                    label={getRelationshipLabel(model, visibleModels[index + 1])}
                    hasRelationship={!!getRelationshipLabel(model, visibleModels[index + 1])}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Model detail panel - appears when a model is selected */}
          {selectedModel && (
            <ModelDetailPanel
              modelName={selectedModel}
              relationships={relationships}
              modelSchema={modelSchemas?.[selectedModel]}
              fixtureData={fixtureData?.[selectedModel]}
              onClose={() => setSelectedModel(null)}
              onModelClick={handleModelClick}
              onExploreSchema={() => setSchemaExplorerOpen(true)}
            />
          )}

          {/* Summary stats */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-lg font-semibold tabular-nums">{models.length}</p>
              <p className="text-xs text-muted-foreground">Models</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-lg font-semibold tabular-nums">{relationships.length}</p>
              <p className="text-xs text-muted-foreground">Relationships</p>
            </div>
            {clusters.length > 1 && (
              <>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <p className="text-lg font-semibold tabular-nums">{clusters.length}</p>
                  <p className="text-xs text-muted-foreground">Clusters</p>
                </div>
              </>
            )}
            {remainingCount > 0 && (
              <>
                <div className="h-8 w-px bg-border" />
                <Badge variant="outline" className="text-xs">
                  +{remainingCount} hidden
                </Badge>
              </>
            )}
          </div>

          {/* Cluster badges */}
          {clusters.length > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
              {clusters.slice(0, 5).map((cluster) => (
                <Badge
                  key={cluster.name}
                  variant="outline"
                  className={`text-[10px] px-2 py-0.5 ${cluster.color}`}
                >
                  <Layers className="h-2.5 w-2.5 mr-1" />
                  {cluster.name}
                  <span className="ml-1 opacity-60">{cluster.models.length}</span>
                </Badge>
              ))}
              {clusters.length > 5 && (
                <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                  +{clusters.length - 5} more
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>

      {/* Schema Explorer Sheet */}
      {projectId && (
        <SchemaExplorerSheet
          open={schemaExplorerOpen}
          onOpenChange={setSchemaExplorerOpen}
          projectId={projectId}
          models={models}
          relationships={relationships.map(r => ({
            source: r.source,
            target: r.target,
            type: r.type,
          }))}
          modelSchemas={modelSchemas ? Object.fromEntries(
            Object.entries(modelSchemas).map(([key, schema]) => [
              key,
              {
                name: schema.name,
                type: schema.type,
                description: schema.description,
                properties: schema.properties ? Object.fromEntries(
                  Object.entries(schema.properties).map(([propKey, prop]) => [
                    propKey,
                    {
                      name: prop.name,
                      type: prop.type,
                      format: prop.format,
                      description: prop.description,
                      required: prop.required,
                      nullable: prop.nullable,
                    }
                  ])
                ) : undefined,
                required: schema.required,
              }
            ])
          ) : undefined}
          clusters={clusters.map(c => ({
            name: c.name,
            models: c.models,
            color: c.color.split(' ')[0], // Just use the bg color class
          }))}
          selectedModel={selectedModel ?? undefined}
          onSelectModel={(model) => setSelectedModel(model)}
        />
      )}
    </Card>
  )
}
