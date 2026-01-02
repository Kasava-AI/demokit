import { Loader2 } from 'lucide-react'

export function ProjectLoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Loading project...</p>
      </div>
    </div>
  )
}
