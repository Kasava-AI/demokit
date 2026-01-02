'use client'

import { useMemo } from 'react'
import {
  formatAsTypeScript,
  formatAsJSON,
  formatAsSQL,
  formatAsCSV,
} from '@demokit-ai/core'
import { CodeHighlighter } from '@/components/ui/code-highlighter'
import type { DemoData, DemoNarrative, ExportFormat } from './types'

interface CodeViewProps {
  code?: string
  data?: DemoData
  format?: ExportFormat
  narrative?: DemoNarrative
  /** For CSV format, which model to display */
  selectedModel?: string
}

// Map export format to Shiki language
const formatToLanguage: Record<ExportFormat, string> = {
  typescript: 'typescript',
  json: 'json',
  sql: 'sql',
  csv: 'csv',
}

export function CodeView({
  code,
  data,
  format = 'typescript',
  narrative,
  selectedModel,
}: CodeViewProps) {
  const displayCode = useMemo(() => {
    // If pre-formatted code is provided (from generation), use it
    if (code && format === 'typescript') {
      return code
    }

    // If no data, return empty
    if (!data) {
      return ''
    }

    // Format using OSS formatters based on selected format
    switch (format) {
      case 'typescript':
        return formatAsTypeScript(data, {
          asConst: true,
          includeHeader: true,
          narrative,
        })

      case 'json':
        return formatAsJSON(data, {
          indent: 2,
          includeMetadata: false,
        })

      case 'sql':
        return formatAsSQL(data)

      case 'csv':
        // CSV only supports one model at a time
        if (selectedModel) {
          return formatAsCSV(data, selectedModel)
        }
        // Default to first model if none selected
        const firstModel = Object.keys(data)[0]
        return firstModel ? formatAsCSV(data, firstModel) : ''

      default:
        return JSON.stringify(data, null, 2)
    }
  }, [code, data, format, narrative, selectedModel])

  const language = formatToLanguage[format] || 'typescript'

  if (!displayCode) {
    return (
      <div className="p-4 bg-muted rounded-lg text-muted-foreground text-sm">
        No code to display
      </div>
    )
  }

  return (
    <div className="overflow-auto max-h-96 rounded-lg bg-muted">
      <CodeHighlighter
        code={displayCode}
        language={language}
        showLineNumbers
        variant="full"
        maxHeight="384px"
        wrapLongLines={format === 'sql' || format === 'csv'}
      />
    </div>
  )
}
