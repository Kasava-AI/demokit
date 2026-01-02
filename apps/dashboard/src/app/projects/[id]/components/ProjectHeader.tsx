import Link from 'next/link'
import { ArrowLeft, RefreshCw, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProjectHeaderActionsProps {
  projectId?: string
  hasSchema: boolean
  isRegenerating: boolean
  isGenerating?: boolean
  onRegenerateIntelligence: () => void
  onOpenSettings: () => void
}

export function ProjectHeaderActions({
  hasSchema,
  isRegenerating,
  isGenerating = false,
  onRegenerateIntelligence,
  onOpenSettings,
}: ProjectHeaderActionsProps) {
  return (
    <>
      {hasSchema && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerateIntelligence}
          disabled={isRegenerating || isGenerating}
          className="gap-1.5 text-muted-foreground"
        >
          <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">
            {isRegenerating ? 'Regenerating...' : 'Regenerate AI'}
          </span>
        </Button>
      )}

      <Button variant="ghost" size="sm" className="gap-1.5" onClick={onOpenSettings}>
        <Settings className="h-4 w-4" />
        <span className="hidden sm:inline">Settings</span>
      </Button>
    </>
  )
}

interface ProjectBackButtonProps {
  href?: string
}

export function ProjectBackButton({ href = '/projects' }: ProjectBackButtonProps) {
  return (
    <Link href={href}>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <ArrowLeft className="h-4 w-4" />
      </Button>
    </Link>
  )
}
