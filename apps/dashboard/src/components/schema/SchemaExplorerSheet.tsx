'use client'

/**
 * SchemaExplorerSheet Component
 *
 * A slide-out panel (80% width) containing a full React Flow-based
 * schema visualization with clustering support.
 *
 * Features:
 * - Pan/zoom canvas with React Flow
 * - Clustered model layout using Dagre
 * - Collapsible clusters
 * - Search/filter models
 * - "Open in new tab" link to full page route
 */

import React, { useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ExternalLink,
  Search,
  Layers,
  X,
} from 'lucide-react'
import { SchemaCanvas } from './SchemaCanvas'

// Types
export interface SchemaRelationship {
  source: string
  target: string
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many'
}

export interface SchemaProperty {
  name: string
  type: string
  format?: string
  description?: string
  required?: boolean
  nullable?: boolean
}

export interface SchemaModel {
  name: string
  type: string
  description?: string
  properties?: Record<string, SchemaProperty>
  required?: string[]
}

export interface SchemaCluster {
  name: string
  models: string[]
  color: string
  collapsed?: boolean
}

interface SchemaExplorerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  models: string[]
  relationships: SchemaRelationship[]
  modelSchemas?: Record<string, SchemaModel>
  clusters?: SchemaCluster[]
  selectedModel?: string
  onSelectModel?: (model: string | null) => void
}

export function SchemaExplorerSheet({
  open,
  onOpenChange,
  projectId,
  models,
  relationships,
  modelSchemas,
  clusters: initialClusters,
  selectedModel,
  onSelectModel,
}: SchemaExplorerSheetProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [clusters, setClusters] = useState<SchemaCluster[]>(initialClusters || [])

  // Filter models based on search
  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return models
    const query = searchQuery.toLowerCase()
    return models.filter((m) => m.toLowerCase().includes(query))
  }, [models, searchQuery])

  // Toggle cluster collapsed state
  const handleToggleCluster = useCallback((clusterName: string) => {
    setClusters((prev) =>
      prev.map((c) =>
        c.name === clusterName ? { ...c, collapsed: !c.collapsed } : c
      )
    )
  }, [])

  // Get visible models (not in collapsed clusters)
  const visibleModels = useMemo(() => {
    const collapsedClusters = new Set(
      clusters.filter((c) => c.collapsed).flatMap((c) => c.models)
    )
    return filteredModels.filter((m) => !collapsedClusters.has(m))
  }, [filteredModels, clusters])

  // Filter relationships to only include visible models
  const visibleRelationships = useMemo(() => {
    const modelSet = new Set(visibleModels)
    return relationships.filter(
      (r) => modelSet.has(r.source) && modelSet.has(r.target)
    )
  }, [relationships, visibleModels])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        open={open}
        side="right"
        className="w-[85vw] max-w-none sm:max-w-none p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-lg">Schema Explorer</SheetTitle>
              <SheetDescription className="text-sm">
                Interactive visualization of your data model
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/projects/${projectId}/schema`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open in New Tab
                </Button>
              </Link>
            </div>
          </div>
        </SheetHeader>

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
                  variant={cluster.collapsed ? 'outline' : 'secondary'}
                  size="sm"
                  className={`h-7 text-xs gap-1 ${cluster.color}`}
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
              {visibleModels.length} / {models.length} models
            </span>
            <span>{visibleRelationships.length} relationships</span>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <SchemaCanvas
            models={visibleModels}
            relationships={visibleRelationships}
            modelSchemas={modelSchemas}
            clusters={clusters.filter((c) => !c.collapsed)}
            selectedModel={selectedModel}
            onSelectModel={onSelectModel}
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
      </SheetContent>
    </Sheet>
  )
}
