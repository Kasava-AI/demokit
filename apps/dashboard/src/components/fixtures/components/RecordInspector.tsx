/**
 * RecordInspector Component
 *
 * Sheet panel for inspecting a single record's full details.
 */

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

export interface InspectedRecord {
  model: string
  index: number
  data: Record<string, unknown>
}

interface RecordInspectorProps {
  record: InspectedRecord | null
  onClose: () => void
}

export function RecordInspector({ record, onClose }: RecordInspectorProps) {
  return (
    <Sheet open={!!record} onOpenChange={(open) => !open && onClose()}>
      <SheetContent open={!!record} className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="px-6 pt-6 pb-4">
          <SheetTitle className="text-lg">
            {record?.model} #{record?.index !== undefined ? record.index + 1 : ''}
          </SheetTitle>
        </SheetHeader>
        <div className="px-6 pb-6 space-y-5">
          {record && Object.entries(record.data).map(([field, value]) => (
            <div key={field} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {field}
              </label>
              <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                <pre className="text-sm text-foreground whitespace-pre-wrap break-words font-mono">
                  {formatInspectedValue(value)}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function formatInspectedValue(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}
