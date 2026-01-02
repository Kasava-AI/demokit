'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IntelligenceProgress } from '@/components/intelligence/IntelligenceProgress'
import type { IntelligencePhase } from '@intelligence'
import type { StreamIntelligenceStatus } from '@/hooks/use-stream-intelligence'

interface RegenerationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  status: StreamIntelligenceStatus
  phase: IntelligencePhase
  progress: number
  message: string
  error: string | null
  isRegenerating: boolean
  onCancel: () => void
  onRetry: () => void
}

export function RegenerationDialog({
  open,
  onOpenChange,
  status,
  phase,
  progress,
  message,
  error,
  isRegenerating,
  onCancel,
  onRetry,
}: RegenerationDialogProps) {
  const handleClose = () => {
    if (isRegenerating) {
      onCancel()
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Regenerate Intelligence</DialogTitle>
          <DialogDescription>
            Re-analyzing your schema to update features, journeys, and templates.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <IntelligenceProgress
            progress={{
              phase,
              progress,
              message,
              errors: error ? [error] : undefined,
            }}
          />
        </div>
        <DialogFooter>
          {isRegenerating ? (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          ) : status === 'complete' ? (
            <Button onClick={handleClose}>
              Done
            </Button>
          ) : status === 'error' ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={onRetry}>
                Try Again
              </Button>
            </div>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
