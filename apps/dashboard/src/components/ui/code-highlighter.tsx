'use client'

import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import { CSSProperties, useMemo, useEffect, useState } from 'react'
import {
  codeToHtml,
  BundledLanguage,
  BundledTheme,
  ShikiTransformer,
} from 'shiki'
import type { Element } from 'hast'
import './shiki-line-numbers.css'

export interface CodeHighlighterProps {
  code: string
  language?: string
  showLineNumbers?: boolean
  variant?: 'compact' | 'full' | 'diff' | 'preview'
  className?: string
  maxHeight?: string | number
  wrapLongLines?: boolean
  startingLineNumber?: number
  lineProps?: (lineNumber: number) => {
    style?: CSSProperties
    className?: string
  }
  customStyle?: CSSProperties
}

const variantStyles: Record<string, CSSProperties> = {
  compact: {
    fontSize: '0.875rem',
    margin: 0,
  },
  full: {
    fontSize: '0.875rem',
    margin: 0,
  },
  diff: {
    fontSize: '0.875rem',
    margin: 0,
  },
  preview: {
    fontSize: '0.75rem',
    margin: 0,
    maxHeight: '200px',
    overflow: 'auto',
  },
}

// CSS custom properties for padding variants (applied to pre element via CSS variable)
const variantPaddingLeft: Record<string, string> = {
  compact: '0.5rem',
  full: '1rem',
  diff: '0.75rem',
  preview: '0.5rem',
}

// Map common language aliases to Shiki-supported languages
const languageMap: Record<string, BundledLanguage> = {
  plaintext: 'typescript',
  text: 'typescript',
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  py: 'python',
  rb: 'ruby',
  sh: 'bash',
  yml: 'yaml',
  md: 'markdown',
}

export function CodeHighlighter({
  code,
  language = 'typescript',
  showLineNumbers = false,
  variant = 'full',
  className,
  maxHeight,
  wrapLongLines = false,
  startingLineNumber = 1,
  lineProps: _lineProps,
  customStyle = {},
}: CodeHighlighterProps) {
  const { theme } = useTheme()
  const [html, setHtml] = useState<string>('')

  const isDark = theme === 'dark'
  const shikiTheme: BundledTheme = isDark ? 'dark-plus' : 'light-plus'

  // Normalize language
  const normalizedLanguage = (languageMap[language] ||
    language) as BundledLanguage

  const baseStyle: CSSProperties = useMemo(
    () => ({
      ...variantStyles[variant],
      ...(maxHeight ? { maxHeight, overflow: 'auto' } : {}),
      ...customStyle,
    }),
    [variant, maxHeight, customStyle]
  )

  useEffect(() => {
    let cancelled = false

    // Create custom transformer for line highlighting if lineProps is provided
    const transformers: ShikiTransformer[] = []

    if (_lineProps) {
      const linePropsTransformer: ShikiTransformer = {
        name: 'line-props-transformer',
        line(node: Element, line: number) {
          // Calculate actual line number with offset
          const lineNumber = startingLineNumber + line - 1

          // Get custom props for this line
          const props = _lineProps(lineNumber)

          if (props.style) {
            // Apply inline styles to the line element
            if (!node.properties) {
              node.properties = {}
            }

            // Convert CSSProperties to style string
            const styleString = Object.entries(props.style)
              .map(([key, value]) => {
                // Convert camelCase to kebab-case
                const cssKey = key.replace(
                  /[A-Z]/g,
                  (match) => `-${match.toLowerCase()}`
                )
                return `${cssKey}: ${value}`
              })
              .join('; ')

            node.properties.style = styleString
          }

          if (props.className) {
            // Add classes
            if (!node.properties) {
              node.properties = {}
            }
            const existingClasses = node.properties.className || []
            const classArray = Array.isArray(existingClasses)
              ? existingClasses.filter((c): c is string | number => typeof c === 'string' || typeof c === 'number')
              : typeof existingClasses === 'string' || typeof existingClasses === 'number' ? [existingClasses] : []
            node.properties.className = [...classArray, props.className]
          }
        },
      }

      transformers.push(linePropsTransformer)
    }

    codeToHtml(code, {
      lang: normalizedLanguage,
      theme: shikiTheme,
      structure: 'classic',
      transformers,
    })
      .then((result: string) => {
        if (!cancelled) {
          // Apply line numbers if needed
          let processedHtml = result

          if (showLineNumbers) {
            // Add shiki-line-numbers class to pre element
            processedHtml = result.replace(
              '<pre class="shiki',
              `<pre class="shiki shiki-line-numbers"`
            )

            // Set the starting line number via CSS custom property
            processedHtml = processedHtml.replace(
              '<code>',
              `<code style="--start: ${startingLineNumber};">`
            )
          }

          setHtml(processedHtml)
        }
      })
      .catch((error: unknown) => {
        console.error('Shiki highlighting error:', error)
        // Fallback to plain text
        setHtml(`<pre><code>${code}</code></pre>`)
      })

    return () => {
      cancelled = true
    }
  }, [
    code,
    normalizedLanguage,
    shikiTheme,
    showLineNumbers,
    startingLineNumber,
    _lineProps,
  ])

  return (
    <div
      className={cn('relative w-full overflow-hidden rounded-md', className)}
      style={baseStyle}
    >
      <div
        className="shiki-wrapper font-mono"
        style={{
          whiteSpace: wrapLongLines ? 'pre-wrap' : 'pre',
          wordBreak: wrapLongLines ? 'break-word' : 'normal',
          '--shiki-padding-left': variantPaddingLeft[variant],
        } as CSSProperties}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

// Export a variant for inline code snippets
export function InlineCodeHighlighter({
  code,
  language = 'typescript',
}: {
  code: string
  language?: string
}) {
  return (
    <CodeHighlighter
      code={code}
      language={language}
      variant="compact"
      className="inline-block"
      customStyle={{
        display: 'inline',
        padding: '0.125rem 0.25rem',
        fontSize: '0.875em',
      }}
    />
  )
}
