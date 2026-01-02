/**
 * ModelExportActions Component
 *
 * Export format dropdown, copy, and download buttons for a model.
 */

import { Check, ChevronDown, Copy, Download } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { ExportFormat } from './types'

export const FORMAT_OPTIONS: { value: ExportFormat; label: string; extension: string }[] = [
  { value: 'typescript', label: 'TypeScript', extension: 'ts' },
  { value: 'json', label: 'JSON', extension: 'json' },
  { value: 'sql', label: 'SQL', extension: 'sql' },
  { value: 'csv', label: 'CSV', extension: 'csv' },
]

interface ModelExportActionsProps {
  format: ExportFormat
  onFormatChange: (format: ExportFormat) => void
  onCopy: () => void
  onDownload: () => void
  isCopied: boolean
}

export function ModelExportActions({
  format,
  onFormatChange,
  onCopy,
  onDownload,
  isCopied,
}: ModelExportActionsProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        {/* Format dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-md bg-background"
              onClick={(e) => e.stopPropagation()}
            >
              {FORMAT_OPTIONS.find(f => f.value === format)?.label || 'TypeScript'}
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            {FORMAT_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onFormatChange(option.value)}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Copy button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-background"
              onClick={(e) => {
                e.stopPropagation()
                onCopy()
              }}
            >
              {isCopied ? (
                <Check className="h-3.5 w-3.5 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isCopied ? 'Copied!' : 'Copy'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Download button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-background"
              onClick={(e) => {
                e.stopPropagation()
                onDownload()
              }}
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Download</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
