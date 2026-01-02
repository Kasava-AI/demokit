'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Building2, Cloud } from 'lucide-react'

interface CreateOrgDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Create Organization Dialog
 *
 * In OSS mode, organizations are not available - this dialog explains
 * that it's a cloud-only feature and provides a link to upgrade.
 */
export function CreateOrgDialog({ open, onOpenChange }: CreateOrgDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>Organizations</DialogTitle>
          </div>
          <DialogDescription>
            Organizations allow you to collaborate with your team, manage shared
            projects, and control access permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="rounded-lg border border-dashed p-4 text-center space-y-3">
            <Cloud className="h-8 w-8 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium">Cloud Feature</p>
              <p className="text-sm text-muted-foreground mt-1">
                Organizations and team collaboration are available in DemoKit Cloud.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              className="flex-1"
              onClick={() => window.open('https://demokit.ai/cloud', '_blank')}
            >
              Learn More
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
