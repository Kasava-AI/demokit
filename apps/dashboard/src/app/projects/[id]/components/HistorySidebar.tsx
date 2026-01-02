'use client'

import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { History, ChevronDown } from 'lucide-react'
import { GenerationHistory, type GenerationHistoryEntry } from '@/components/history'

interface HistorySidebarProps {
  history: GenerationHistoryEntry[]
  selectedId?: string
  onSelect: (entry: GenerationHistoryEntry) => void
  onDelete: (entryId: string) => void
  onClear: () => void
}

export function HistorySidebar({
  history,
  selectedId,
  onSelect,
  onDelete,
  onClear,
}: HistorySidebarProps) {
  return (
    <Collapsible defaultOpen={false} className="sticky top-8">
      <div className="border rounded-lg bg-card">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">History</span>
              {history.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {history.length}
                </Badge>
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 border-t">
            <GenerationHistory
              entries={history}
              selectedId={selectedId}
              onSelect={onSelect}
              onDelete={onDelete}
              onClear={onClear}
            />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
