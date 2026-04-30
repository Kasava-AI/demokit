'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useProjects } from '@/hooks/use-projects'
import { useOrganizationContext } from '@/contexts/organization-context'
import { AppLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/utils'

const DEFAULT_VISIBLE = 6

export default function ProjectsPage() {
  const { currentOrg, isLoading: orgLoading } = useOrganizationContext()
  const [showAll, setShowAll] = useState(false)
  const { data: projects, isLoading, error } = useProjects(currentOrg?.id)

  // Header action for creating new project
  const headerActions = (
    <Link href="/projects/new">
      <Button size="sm" className="gap-2">
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">New Project</span>
      </Button>
    </Link>
  )

  return (
    <AppLayout title="Projects" headerActions={headerActions}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading || orgLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-5 bg-card rounded-lg border border-border">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full mt-2" />
                <Skeleton className="h-3 w-24 mt-3" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-sm text-destructive mb-4">
              Failed to load projects: {error.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted"
            >
              Retry
            </button>
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground mb-4">
              No projects yet
            </p>
            <Link
              href="/projects/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90"
            >
              Create your first project
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(showAll ? projects : projects.slice(0, DEFAULT_VISIBLE)).map((project, i) => (
                <ProjectCard key={project.id} project={project} index={i} />
              ))}
            </div>
            {!showAll && projects.length > DEFAULT_VISIBLE && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAll(true)}
                  className="text-sm text-primary hover:text-primary/80 font-medium"
                >
                  View all ({projects.length})
                </button>
              </div>
            )}
            {showAll && projects.length > DEFAULT_VISIBLE && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAll(false)}
                  className="text-sm text-muted-foreground hover:text-foreground font-medium"
                >
                  Show less
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}

type ProjectCardProject = {
  id: string
  name: string
  description: string | null
  status: string
  createdAt: string | Date
}

function ProjectCard({ project, index }: { project: ProjectCardProject; index: number }) {
  const prefersReducedMotion = useReducedMotion()
  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 5) * 0.04, duration: 0.2, ease: 'easeOut' }}
    >
      <Link
        href={`/projects/${project.id}`}
        className="block p-5 bg-card rounded-lg border border-border hover:border-border/80 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-foreground">{project.name}</h3>
          <StatusBadge status={project.status} />
        </div>
        {project.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {project.description}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground/70">
          Created {new Date(project.createdAt).toLocaleDateString()}
        </p>
      </Link>
    </motion.div>
  )
}

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-muted-foreground/60',
  analyzing: 'bg-primary',
  ready: 'bg-success',
  error: 'bg-destructive',
}

function StatusBadge({ status }: { status: string }) {
  const prefersReducedMotion = useReducedMotion()
  const dotClass = STATUS_DOT[status] ?? STATUS_DOT.pending
  const isAnimating = status === 'analyzing'
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 mt-1">
      {isAnimating && !prefersReducedMotion ? (
        <motion.span
          className={cn('size-1.5 rounded-full', dotClass)}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      ) : (
        <span className={cn('size-1.5 rounded-full', dotClass)} />
      )}
      {status}
    </span>
  )
}
