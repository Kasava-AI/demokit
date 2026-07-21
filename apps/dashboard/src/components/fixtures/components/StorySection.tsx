/**
 * StorySection Component
 *
 * The story prompt box (spec §5). Prose in, StorySpec out, deterministic
 * generation on top:
 * - Unlinked fixtures show a demo/variant picker + "Link" action (persists
 *   the link via the fixture PUT's demoId/variantId).
 * - Linked fixtures show the current StorySpec summary (when the linked
 *   variant has one), a free-text prompt box that writes a new StorySpec via
 *   the LLM (useWriteStorySpec), and a "Generate data from story" action
 *   that runs the deterministic executor (useGenerateStory) and lands a
 *   draft (or initial-publish) generation.
 */

'use client'

import { useCallback, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { useDemos, useDemoVariant, useWriteStorySpec, useGenerateStory } from '@/hooks/use-demos'
import { useUpdateFixture } from '@/hooks/use-fixtures'
import type { StorySpec } from '@demokit-ai/core'

export interface StorySectionProps {
  projectId: string
  fixtureId: string
  /** Demo-system link (Phase 2) — null until the fixture is linked to a variant. */
  demoId: string | null
  /** Variant link (Phase 2) — null until the fixture is linked to a variant. */
  variantId: string | null
}

const MAX_CHIPS = 5

function capped(items: string[]): string {
  const shown = items.slice(0, MAX_CHIPS)
  const overflow = items.length - shown.length
  return overflow > 0 ? `${shown.join(', ')} +${overflow} more` : shown.join(', ')
}

function formatChipValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function formatCounts(counts: StorySpec['counts'] | undefined): string[] {
  return Object.entries(counts ?? {}).map(([model, count]) => `${model} × ${count}`)
}

function formatPins(pins: StorySpec['pins'] | undefined): string[] {
  return (pins ?? []).map((pin) => `${pin.path} = ${formatChipValue(pin.value)}`)
}

function formatAnchors(anchors: StorySpec['anchors'] | undefined): string[] {
  return (anchors ?? []).map(
    (anchor) =>
      `${anchor.model}: ${Object.entries(anchor.attrs)
        .map(([key, value]) => `${key}=${formatChipValue(value)}`)
        .join(', ')}`
  )
}

function formatTrends(trends: StorySpec['trends'] | undefined): string[] {
  return (trends ?? []).map((trend) => `${trend.model}.${trend.dateField} ${trend.shape}`)
}

function SpecChipRow({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <p className="text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{label}:</span> {capped(items)}
    </p>
  )
}

export function StorySection({ projectId, fixtureId, demoId, variantId }: StorySectionProps) {
  const isLinked = !!demoId && !!variantId

  // ---- Unlinked state: demo/variant pickers ----
  const { data: demos = [], isLoading: demosLoading } = useDemos(projectId, {
    enabled: !isLinked,
  })
  const [selectedDemoId, setSelectedDemoId] = useState('')
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const updateFixtureMutation = useUpdateFixture()

  const selectedDemo = useMemo(
    () => demos.find((demo) => demo.id === selectedDemoId),
    [demos, selectedDemoId]
  )
  const variantOptions = selectedDemo?.variants ?? []

  const handleDemoChange = (value: string) => {
    setSelectedDemoId(value)
    setSelectedVariantId('')
  }

  const handleLink = useCallback(async () => {
    if (!selectedDemoId || !selectedVariantId) return
    try {
      await updateFixtureMutation.mutateAsync({
        projectId,
        fixtureId,
        data: { demoId: selectedDemoId, variantId: selectedVariantId },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to link variant')
    }
  }, [selectedDemoId, selectedVariantId, projectId, fixtureId, updateFixtureMutation])

  // ---- Linked state: story spec summary + prompt box ----
  const { data: linkedVariant, isLoading: variantLoading } = useDemoVariant(
    projectId,
    demoId ?? '',
    variantId ?? ''
  )
  const [prose, setProse] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [localSpec, setLocalSpec] = useState<StorySpec | null>(null)

  const writeMutation = useWriteStorySpec()
  const generateMutation = useGenerateStory()

  const effectiveSpec = useMemo<StorySpec | null>(() => {
    if (localSpec) return localSpec
    if (linkedVariant?.storySpec) return linkedVariant.storySpec as unknown as StorySpec
    return null
  }, [localSpec, linkedVariant])

  const handleWriteSpec = useCallback(async () => {
    if (!demoId || !variantId || !prose.trim()) return
    try {
      const result = await writeMutation.mutateAsync({
        projectId,
        demoId,
        variantId,
        prose: prose.trim(),
      })
      setLocalSpec(result.spec as unknown as StorySpec)
      setWarnings(result.warnings)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to write story spec')
    }
  }, [demoId, variantId, prose, projectId, writeMutation])

  const handleGenerate = useCallback(async () => {
    if (!variantId) return
    try {
      const result = await generateMutation.mutateAsync({ projectId, fixtureId, variantId })
      toast.success('Draft generated', {
        description: result.validation.valid
          ? 'Validation passed'
          : 'Validation failed — fix before publishing',
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate from story')
    }
  }, [variantId, projectId, fixtureId, generateMutation])

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      void handleWriteSpec()
    }
  }

  if (!isLinked) {
    return (
      <section className="space-y-3">
        <h3 className="text-sm font-medium">Story</h3>
        <p className="text-sm text-muted-foreground">
          Link a demo variant to drive this fixture from a story.
        </p>

        {demosLoading ? (
          <Skeleton className="h-8 w-full rounded-md" />
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="story-demo-select">Demo</Label>
              <select
                id="story-demo-select"
                value={selectedDemoId}
                onChange={(e) => handleDemoChange(e.target.value)}
                className="h-8 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
              >
                <option value="">Choose a demo</option>
                {demos.map((demo) => (
                  <option key={demo.id} value={demo.id}>
                    {demo.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="story-variant-select">Variant</Label>
              <select
                id="story-variant-select"
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                disabled={!selectedDemoId}
                className="h-8 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground disabled:opacity-50"
              >
                <option value="">Choose a variant</option>
                {variantOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              size="sm"
              onClick={handleLink}
              disabled={!selectedDemoId || !selectedVariantId}
              loading={updateFixtureMutation.isPending}
            >
              Link
            </Button>
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">Story</h3>

      {variantLoading ? (
        <Skeleton className="h-16 w-full rounded-md" />
      ) : effectiveSpec ? (
        <div className="space-y-1 rounded-md border px-3 py-2">
          <p className="text-sm">{effectiveSpec.scenario}</p>
          <SpecChipRow label="Counts" items={formatCounts(effectiveSpec.counts)} />
          <SpecChipRow label="Pins" items={formatPins(effectiveSpec.pins)} />
          <SpecChipRow label="Anchors" items={formatAnchors(effectiveSpec.anchors)} />
          <SpecChipRow label="Trends" items={formatTrends(effectiveSpec.trends)} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No story spec yet — tell the story below.</p>
      )}

      <div className="space-y-2">
        <Label htmlFor="story-prose">Tell the story</Label>
        <Textarea
          id="story-prose"
          value={prose}
          onChange={(e) => setProse(e.target.value)}
          onKeyDown={handleTextareaKeyDown}
          placeholder="The prospect is a mid-market SaaS team evaluating us against…"
          rows={4}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleWriteSpec}
          disabled={!prose.trim() || writeMutation.isPending}
          loading={writeMutation.isPending}
        >
          {writeMutation.isPending ? 'Writing…' : 'Write story spec'}
        </Button>
      </div>

      {warnings.length > 0 && (
        <ul className="space-y-1">
          {warnings.map((warning, i) => (
            <li key={`${i}-${warning}`} className="text-xs text-warning">
              {warning}
            </li>
          ))}
        </ul>
      )}

      <Button
        size="sm"
        onClick={handleGenerate}
        disabled={!effectiveSpec || generateMutation.isPending}
      >
        {generateMutation.isPending ? (
          <>
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Generating…
          </>
        ) : (
          'Generate data from story'
        )}
      </Button>
    </section>
  )
}
