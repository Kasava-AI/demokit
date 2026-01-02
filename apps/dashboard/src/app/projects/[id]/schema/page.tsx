'use client'

/**
 * Schema Explorer Full Page
 *
 * Full-screen React Flow canvas for schema visualization.
 * Accessible from the "Open in New Tab" link in SchemaExplorerSheet.
 * Features:
 * - Full viewport canvas
 * - Back navigation to project
 * - All cluster and model controls
 */

import React, { use, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { useProject } from '@/hooks/use-projects'
import { AppLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Search,
  Layers,
  X,
  Download,
} from 'lucide-react'
import { SchemaCanvas } from '@/components/schema/SchemaCanvas'
import type {
  SchemaRelationship,
  SchemaModel,
  SchemaCluster,
} from '@/components/schema/SchemaExplorerSheet'

// Auto-detect clusters based on naming patterns
function detectClusters(models: string[]): SchemaCluster[] {
  const clusterMap = new Map<string, Set<string>>()

  const prefixPatterns = [
    { pattern: /^(user|profile|auth|account)/i, name: 'Auth', color: 'bg-blue-500' },
    { pattern: /^(order|cart|checkout|payment)/i, name: 'Orders', color: 'bg-green-500' },
    { pattern: /^(product|item|inventory|catalog)/i, name: 'Products', color: 'bg-purple-500' },
    { pattern: /^(github|linear|asana|jira)/i, name: 'Integrations', color: 'bg-orange-500' },
    { pattern: /^(log|event|metric|analytics)/i, name: 'Analytics', color: 'bg-cyan-500' },
    { pattern: /^(config|setting|preference)/i, name: 'Config', color: 'bg-slate-500' },
    { pattern: /^(team|org|member|role)/i, name: 'Teams', color: 'bg-pink-500' },
    { pattern: /^(doc|content|page|post)/i, name: 'Content', color: 'bg-amber-500' },
  ]

  const colorMap: Record<string, string> = {}

  models.forEach((model) => {
    let assigned = false
    for (const { pattern, name, color } of prefixPatterns) {
      if (pattern.test(model)) {
        if (!clusterMap.has(name)) {
          clusterMap.set(name, new Set())
          colorMap[name] = color
        }
        clusterMap.get(name)!.add(model)
        assigned = true
        break
      }
    }
    if (!assigned) {
      if (!clusterMap.has('Other')) {
        clusterMap.set('Other', new Set())
        colorMap['Other'] = 'bg-muted'
      }
      clusterMap.get('Other')!.add(model)
    }
  })

  return Array.from(clusterMap.entries())
    .filter(([_, modelSet]) => modelSet.size > 0)
    .map(([name, modelSet]) => ({
      name,
      models: Array.from(modelSet),
      color: colorMap[name] || 'bg-muted',
    }))
    .sort((a, b) => b.models.length - a.models.length)
}

export default function SchemaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: project, isLoading, error } = useProject(id)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [collapsedClusters, setCollapsedClusters] = useState<Set<string>>(new Set())

  // Extract schema data
  const schemaData = useMemo(() => {
    if (!project?.schema) return null
    const schema = project.schema as {
      models?: Record<string, SchemaModel>
      relationships?: Array<{
        from: { model: string }
        to: { model: string }
        type: string
      }>
    }
    return {
      models: Object.keys(schema.models || {}),
      modelSchemas: schema.models,
      relationships: (schema.relationships || []).map((r) => ({
        source: r.from.model,
        target: r.to.model,
        type: r.type as SchemaRelationship['type'],
      })),
    }
  }, [project?.schema])

  // Detect clusters
  const clusters = useMemo(() => {
    if (!schemaData) return []
    return detectClusters(schemaData.models)
  }, [schemaData])

  // Filter models based on search and collapsed clusters
  const filteredData = useMemo(() => {
    if (!schemaData) return { models: [], relationships: [] }

    let models = schemaData.models

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      models = models.filter((m) => m.toLowerCase().includes(query))
    }

    // Filter out collapsed cluster models
    const collapsedModels = new Set(
      clusters
        .filter((c) => collapsedClusters.has(c.name))
        .flatMap((c) => c.models)
    )
    models = models.filter((m) => !collapsedModels.has(m))

    // Filter relationships to only include visible models
    const modelSet = new Set(models)
    const relationships = schemaData.relationships.filter(
      (r) => modelSet.has(r.source) && modelSet.has(r.target)
    )

    return { models, relationships }
  }, [schemaData, searchQuery, clusters, collapsedClusters])

  // Toggle cluster collapsed state
  const handleToggleCluster = useCallback((clusterName: string) => {
    setCollapsedClusters((prev) => {
      const next = new Set(prev)
      if (next.has(clusterName)) {
        next.delete(clusterName)
      } else {
        next.add(clusterName)
      }
      return next
    })
  }, [])

  if (isLoading) {
    return (
      <AppLayout>
        <div className="h-full flex flex-col">
          <div className="border-b px-6 py-4">
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <Skeleton className="h-96 w-96" />
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error || !project) {
    return (
      <AppLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-destructive">
              {error ? 'Error loading project' : 'Project not found'}
            </p>
            <Link href="/projects">
              <Button variant="link" className="mt-2">
                Back to Projects
              </Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!schemaData || schemaData.models.length === 0) {
    return (
      <AppLayout>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="border-b px-6 py-4">
            <div className="flex items-center gap-4">
              <Link href={`/projects/${id}`}>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold">Schema Explorer</h1>
                <p className="text-sm text-muted-foreground">{project.name}</p>
              </div>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground">No schema available</p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload an OpenAPI schema to visualize your data model
              </p>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/projects/${id}`}>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold">Schema Explorer</h1>
                <p className="text-sm text-muted-foreground">{project.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b flex items-center gap-4 shrink-0 bg-muted/30">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Cluster toggles */}
          {clusters.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">
                Clusters:
              </span>
              {clusters.map((cluster) => (
                <Button
                  key={cluster.name}
                  variant={collapsedClusters.has(cluster.name) ? 'outline' : 'secondary'}
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => handleToggleCluster(cluster.name)}
                >
                  <Layers className="h-3 w-3" />
                  {cluster.name}
                  <span className="opacity-60">({cluster.models.length})</span>
                </Button>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {filteredData.models.length} / {schemaData.models.length} models
            </span>
            <span>{filteredData.relationships.length} relationships</span>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <SchemaCanvas
            models={filteredData.models}
            relationships={filteredData.relationships}
            modelSchemas={schemaData.modelSchemas}
            clusters={clusters.filter((c) => !collapsedClusters.has(c.name))}
            selectedModel={selectedModel ?? undefined}
            onSelectModel={setSelectedModel}
            searchQuery={searchQuery}
          />
        </div>

        {/* Footer with legend */}
        <div className="px-6 py-2 border-t bg-muted/30 flex items-center gap-6 text-xs text-muted-foreground shrink-0">
          <div className="flex items-center gap-4">
            <span className="font-medium">Legend:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-px bg-muted-foreground/50" />
              <span>1:1</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-px bg-muted-foreground/50" />
              <svg width="8" height="8" viewBox="0 0 8 8" className="text-muted-foreground/50">
                <path d="M0 4 L8 0 L8 8 Z" fill="currentColor" />
              </svg>
              <span>1:n</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="8" height="8" viewBox="0 0 8 8" className="text-muted-foreground/50 rotate-180">
                <path d="M0 4 L8 0 L8 8 Z" fill="currentColor" />
              </svg>
              <div className="w-6 h-px bg-muted-foreground/50" />
              <span>n:1</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span>Drag to pan</span>
            <span>|</span>
            <span>Scroll to zoom</span>
            <span>|</span>
            <span>Click model for details</span>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
