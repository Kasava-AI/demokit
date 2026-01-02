'use client'

/**
 * CodeBlock Component
 *
 * Displays code with syntax highlighting via CodeHighlighter (Shiki),
 * copy-to-clipboard functionality, and optional title.
 */

import { useState, useCallback } from 'react'
import { Check, Copy, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CodeHighlighter } from '@/components/ui/code-highlighter'

export interface CodeBlockProps {
  /** The code to display */
  code: string
  /** Optional title for the code block */
  title?: string
  /** Language for syntax highlighting */
  language?: 'typescript' | 'bash' | 'json' | 'tsx' | 'javascript'
  /** Filename for download (if downloadable) */
  filename?: string
  /** Whether to show the download button */
  showDownload?: boolean
  /** Maximum height before scrolling */
  maxHeight?: string
}

export function CodeBlock({
  code,
  title,
  language = 'typescript',
  filename,
  showDownload = false,
  maxHeight = '300px',
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  const handleDownload = useCallback(() => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `code.${getExtension(language)}`
    a.click()
    URL.revokeObjectURL(url)
  }, [code, filename, language])

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
        <div className="flex items-center gap-2">
          {title && (
            <span className="text-sm font-medium text-foreground">
              {title}
            </span>
          )}
          <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted-foreground/10">
            {language}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {showDownload && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={handleDownload}
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-success" />
                <span className="ml-1 text-xs text-success">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span className="ml-1 text-xs">Copy</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Code Content with Syntax Highlighting */}
      <CodeHighlighter
        code={code}
        language={language}
        showLineNumbers
        variant="full"
        maxHeight={maxHeight}
        className="rounded-none"
      />
    </div>
  )
}

function getExtension(language: string): string {
  switch (language) {
    case 'typescript':
    case 'tsx':
      return 'ts'
    case 'bash':
      return 'sh'
    case 'json':
      return 'json'
    default:
      return 'txt'
  }
}
