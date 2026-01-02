import Link from 'next/link'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProjectErrorStateProps {
  error?: Error | null
}

export function ProjectErrorState({ error }: ProjectErrorStateProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-md">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Failed to load project
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {error?.message || 'Project not found'}
        </p>
        <Link href="/projects">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
      </div>
    </div>
  )
}
