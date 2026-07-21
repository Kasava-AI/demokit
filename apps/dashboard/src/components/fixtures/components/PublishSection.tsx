/**
 * PublishSection Component
 *
 * Publish/rollback panel (spec §6). Lists generations for a fixture with
 * their publish status, lets the user publish any non-published generation
 * (blocked only on deterministic validation failure), and shows the publish
 * audit history with a one-click rollback (= republishing an older
 * generation). Self-fetches generations + history; Task 8 adds a Preview
 * button into this component.
 */

'use client'

import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  useFixtureGenerations,
  usePublishGeneration,
  usePublishHistory,
  type FixtureGeneration,
} from '@/hooks/use-fixtures'

export interface PublishSectionProps {
  projectId: string
  fixtureId: string
  publishedGenerationId: string | null
  draftGenerationId: string | null
}

interface DialogResult {
  warnings: string[]
  linterFindings: Array<{ severity: 'notice' | 'warning'; message: string; path: string }>
}

export function PublishSection({
  projectId,
  fixtureId,
  publishedGenerationId,
  draftGenerationId,
}: PublishSectionProps) {
  const {
    data: generations = [],
    isLoading: generationsLoading,
    error: generationsError,
  } = useFixtureGenerations(projectId, fixtureId)
  const { data: history = [], error: historyError } = usePublishHistory(projectId, fixtureId)
  const publishMutation = usePublishGeneration()

  const [confirmTarget, setConfirmTarget] = useState<FixtureGeneration | null>(null)
  const [note, setNote] = useState('')
  const [result, setResult] = useState<DialogResult | null>(null)

  // Guards against the confirm dialog's result view leaking across separate
  // publish "attempts" — not just across different generations. Cancelling
  // a pending publish and reopening the dialog for the SAME generation
  // before the first request resolves is a distinct attempt from the first
  // one, even though the target id is identical, so an id-based check alone
  // isn't enough: every session-starting action (open, rollback-open, close)
  // and every publish call bumps this counter; a resolved publish only
  // applies its result if the counter hasn't moved since it started. The
  // publish still commits server-side regardless — only the UI must not
  // show its result against the wrong (or no longer open) dialog.
  const publishAttemptRef = useRef(0)

  const openPublishDialog = (generation: FixtureGeneration) => {
    publishAttemptRef.current += 1
    setResult(null)
    setConfirmTarget(generation)
  }

  const handlePublish = async () => {
    if (!confirmTarget) return
    const targetId = confirmTarget.id
    const targetLabel = confirmTarget.label ?? confirmTarget.id.slice(0, 8)
    const attempt = ++publishAttemptRef.current
    try {
      const payload = await publishMutation.mutateAsync({
        projectId,
        fixtureId,
        generationId: targetId,
        note: note.trim() || undefined,
      })
      toast.success('Published', { description: targetLabel })
      if (publishAttemptRef.current !== attempt) return
      setResult({ warnings: payload.warnings, linterFindings: payload.linterFindings })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Publish failed')
    }
  }

  const closeDialog = () => {
    publishAttemptRef.current += 1
    setConfirmTarget(null)
    setNote('')
    setResult(null)
  }

  const handleRollback = (generationId: string) => {
    const generation = generations.find((g) => g.id === generationId)
    if (!generation) {
      toast.error('That generation no longer exists')
      return
    }
    publishAttemptRef.current += 1
    setResult(null)
    setConfirmTarget(generation)
    setNote('rollback')
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">Publish</h3>

      {generationsError && (
        <p className="text-sm text-destructive">
          Failed to load generations: {generationsError.message}
        </p>
      )}

      {generationsLoading ? (
        <div className="space-y-1" aria-label="Loading generations">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ) : (
        <ul className="space-y-1">
          {generations.map((generation) => {
            const isPublished = generation.id === publishedGenerationId
            const isDraft = generation.id === draftGenerationId
            const invalid = generation.validationValid === false
            const statusLabel = isPublished
              ? 'Published'
              : isDraft
                ? 'Draft'
                : new Date(generation.createdAt).toLocaleDateString()

            return (
              <li
                key={generation.id}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      isPublished
                        ? 'bg-success'
                        : isDraft
                          ? 'bg-warning'
                          : 'bg-muted-foreground/40'
                    }`}
                    aria-hidden
                  />
                  <span className="truncate">{generation.label ?? generation.id.slice(0, 8)}</span>
                  <span className="text-xs text-muted-foreground">
                    {statusLabel}
                    {invalid ? ' · failed validation' : ''}
                  </span>
                </div>
                {!isPublished && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={invalid}
                    title={invalid ? 'Fix validation errors before publishing' : undefined}
                    onClick={() => openPublishDialog(generation)}
                  >
                    <Upload className="mr-1 h-3 w-3" />
                    Publish
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {!generationsLoading && generations.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No generations yet. Generate data to publish a version.
        </p>
      )}

      {historyError && (
        <p className="text-sm text-destructive">
          Failed to load publish history: {historyError.message}
        </p>
      )}

      {history.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground">
            Publish history ({history.length})
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {history.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    {new Date(entry.publishedAt).toLocaleString()} —{' '}
                    {entry.note ?? entry.generationId.slice(0, 8)}
                  </span>
                  {entry.generationId !== publishedGenerationId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={() => handleRollback(entry.generationId)}
                    >
                      Roll back
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}

      <Dialog open={confirmTarget !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{result ? 'Published' : 'Publish this generation?'}</DialogTitle>
            <DialogDescription>
              {result
                ? 'This version now serves the hosted demo API.'
                : 'The SDK serves the published generation. This action is recorded in the audit log.'}
            </DialogDescription>
          </DialogHeader>

          {!result && (
            <div className="space-y-2 py-2">
              <Label htmlFor="publish-note">Note (optional)</Label>
              <Input
                id="publish-note"
                className="h-8"
                value={note}
                maxLength={500}
                placeholder="What changed in this version"
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          )}

          {result && (result.warnings.length > 0 || result.linterFindings.length > 0) && (
            <div className="space-y-2 py-2 text-sm">
              {result.warnings.map((warning, i) => (
                <p key={`${i}-${warning}`} className="flex items-start gap-2 text-warning">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
                  <span>{warning}</span>
                </p>
              ))}
              {result.linterFindings.map((finding, i) => (
                <p
                  key={`${i}-${finding.path}:${finding.message}`}
                  className="flex items-start gap-2 text-muted-foreground"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50"
                    aria-hidden
                  />
                  <span>
                    <span className="font-medium text-foreground">
                      {finding.severity === 'warning' ? 'Story warning' : 'Note'}
                    </span>{' '}
                    ({finding.path}): {finding.message}
                  </span>
                </p>
              ))}
            </div>
          )}
          {result && result.warnings.length === 0 && result.linterFindings.length === 0 && (
            <p className="py-2 text-sm text-muted-foreground">No warnings.</p>
          )}

          <DialogFooter>
            {result ? (
              <Button onClick={closeDialog}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button onClick={handlePublish} loading={publishMutation.isPending}>
                  {publishMutation.isPending ? 'Publishing…' : 'Publish'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
