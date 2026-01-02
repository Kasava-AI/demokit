/**
 * ProjectSettingsSheet Component
 *
 * Sheet for project settings including danger zone actions.
 * Provides a quick way to access project-level settings without
 * navigating away from the current page.
 */

'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Settings, Trash2, Loader2 } from 'lucide-react'
import { useDeleteProject } from '@/hooks/use-projects'

interface ProjectSettingsSheetProps {
  projectId: string
  projectName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectSettingsSheet({
  projectId,
  projectName,
  open,
  onOpenChange,
}: ProjectSettingsSheetProps) {
  const router = useRouter()
  const deleteProject = useDeleteProject()

  const handleDeleteProject = useCallback(async () => {
    try {
      await deleteProject.mutateAsync(projectId)
      onOpenChange(false)
      router.push('/projects')
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }, [projectId, deleteProject, router, onOpenChange])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" open={open} className="sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <SheetTitle>Project Settings</SheetTitle>
              <SheetDescription>{projectName}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {/* Danger Zone */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" />
              <h3 className="text-sm font-medium text-destructive">Danger Zone</h3>
            </div>

            <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <p className="text-sm text-muted-foreground mb-4">
                Permanently delete this project and all its fixtures, generations, and settings.
                This action cannot be undone.
              </p>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Project
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Project</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete &quot;{projectName}&quot;? This action cannot be undone.
                      All fixtures, generations, and settings will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteProject}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteProject.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete Project'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
