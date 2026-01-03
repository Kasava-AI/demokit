'use client'

import Link from 'next/link'
import { useProjects } from '@/hooks/use-projects'
import { useOrganizationContext } from '@/contexts/organization-context'
import { AppLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Loader2, Plus } from 'lucide-react'

export default function ProjectsPage() {
  const { currentOrg, isLoading: orgLoading } = useOrganizationContext()
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
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block p-5 bg-card rounded-lg border border-border hover:border-border/80 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-foreground">
                    {project.name}
                  </h3>
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
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: 'bg-muted text-muted-foreground',
    analyzing: 'bg-primary/10 text-primary',
    ready: 'bg-success/10 text-success',
    error: 'bg-destructive/10 text-destructive',
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        styles[status as keyof typeof styles] || styles.pending
      }`}
    >
      {status}
    </span>
  )
}
