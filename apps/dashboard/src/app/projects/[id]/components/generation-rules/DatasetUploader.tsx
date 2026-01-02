'use client'

/**
 * DatasetUploader Component
 *
 * Allows users to upload or paste CSV content to create a dataset.
 * Supports drag-and-drop file upload and paste-in-textarea.
 */

import React, { useState, useCallback, useRef } from 'react'
import { Upload, FileText, Check, AlertCircle, Loader2, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Column types that can be inferred or selected
type ColumnType = 'string' | 'number' | 'integer' | 'boolean' | 'date' | 'url' | 'email'

// Local type definitions matching codegen types
interface Dataset {
  id: string
  name: string
  columns: string[]
  columnTypes: ColumnType[]
  rows: string[][]
  createdAt: string
  description?: string
}

interface ParseCSVResult {
  success: boolean
  columns?: string[]
  rows?: string[][]
  error?: string
  truncated?: boolean
  originalRowCount?: number
}

interface DatasetUploaderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDatasetCreated: (dataset: Dataset) => void
  existingDatasetNames: string[]
}

type UploadState = 'idle' | 'parsing' | 'previewing' | 'error'

const MAX_ROWS = 1000

/**
 * Parse CSV content into columns and rows
 */
function parseCSV(content: string): ParseCSVResult {
  if (!content || content.trim().length === 0) {
    return { success: false, error: 'CSV content is empty' }
  }

  try {
    const lines = parseCSVLines(content)
    if (lines.length === 0) {
      return { success: false, error: 'No data found in CSV' }
    }

    const columns = lines[0]
    if (columns.length === 0) {
      return { success: false, error: 'No columns found in header row' }
    }

    // Check for duplicate columns
    const columnSet = new Set<string>()
    for (const col of columns) {
      const trimmed = col.trim()
      if (columnSet.has(trimmed)) {
        return { success: false, error: `Duplicate column name: "${trimmed}"` }
      }
      columnSet.add(trimmed)
    }

    // Parse data rows
    const allRows = lines.slice(1)
    const originalRowCount = allRows.length
    const validRows: string[][] = []

    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i]
      // Skip empty rows
      if (row.length === 1 && row[0].trim() === '') continue

      // Validate column count
      if (row.length !== columns.length) {
        return {
          success: false,
          error: `Row ${i + 2} has ${row.length} columns, expected ${columns.length}`,
        }
      }

      validRows.push(row)
      if (validRows.length >= MAX_ROWS) break
    }

    if (validRows.length === 0) {
      return { success: false, error: 'No data rows found in CSV' }
    }

    return {
      success: true,
      columns: columns.map((c) => c.trim()),
      rows: validRows.map((row) => row.map((cell) => cell.trim())),
      truncated: originalRowCount > MAX_ROWS,
      originalRowCount: originalRowCount > MAX_ROWS ? originalRowCount : undefined,
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to parse CSV' }
  }
}

/**
 * Parse CSV content into lines, handling quoted fields
 */
function parseCSVLines(content: string): string[][] {
  const lines: string[][] = []
  let currentLine: string[] = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const nextChar = content[i + 1]

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        currentField += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        currentLine.push(currentField)
        currentField = ''
      } else if (char === '\r') {
        continue
      } else if (char === '\n') {
        currentLine.push(currentField)
        lines.push(currentLine)
        currentLine = []
        currentField = ''
      } else {
        currentField += char
      }
    }
  }

  if (currentField.length > 0 || currentLine.length > 0) {
    currentLine.push(currentField)
    lines.push(currentLine)
  }

  return lines
}

/**
 * Generate a unique dataset ID
 */
function generateDatasetId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `ds_${timestamp}${random}`
}

/**
 * Infer column type from sample values
 */
function inferColumnType(values: string[]): ColumnType {
  // Filter out empty values for analysis
  const nonEmpty = values.filter((v) => v.trim() !== '')
  if (nonEmpty.length === 0) return 'string'

  // Check patterns
  const checks = {
    integer: (v: string) => /^-?\d+$/.test(v),
    number: (v: string) => /^-?\d+\.?\d*$/.test(v) && !isNaN(parseFloat(v)),
    boolean: (v: string) => /^(true|false|yes|no|1|0)$/i.test(v),
    date: (v: string) => {
      // ISO date, common date formats
      if (/^\d{4}-\d{2}-\d{2}/.test(v)) return true
      if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(v)) return true
      const d = new Date(v)
      return !isNaN(d.getTime()) && v.length > 4
    },
    url: (v: string) => /^https?:\/\/.+/.test(v),
    email: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  }

  // Count how many values match each type
  const counts: Record<string, number> = {
    integer: 0,
    number: 0,
    boolean: 0,
    date: 0,
    url: 0,
    email: 0,
  }

  for (const value of nonEmpty) {
    for (const [type, check] of Object.entries(checks)) {
      if (check(value)) counts[type]++
    }
  }

  // Require at least 80% of non-empty values to match for a type
  const threshold = nonEmpty.length * 0.8

  // Check types in order of specificity (more specific first)
  if (counts.email >= threshold) return 'email'
  if (counts.url >= threshold) return 'url'
  if (counts.date >= threshold) return 'date'
  if (counts.boolean >= threshold) return 'boolean'
  if (counts.integer >= threshold) return 'integer'
  if (counts.number >= threshold) return 'number'

  return 'string'
}

/**
 * Infer types for all columns based on sample data
 */
function inferColumnTypes(columns: string[], rows: string[][]): ColumnType[] {
  return columns.map((_, colIdx) => {
    const sampleValues = rows.slice(0, 100).map((row) => row[colIdx])
    return inferColumnType(sampleValues)
  })
}

/**
 * Human-readable labels for column types
 */
const COLUMN_TYPE_LABELS: Record<ColumnType, string> = {
  string: 'Text',
  number: 'Number',
  integer: 'Integer',
  boolean: 'Boolean',
  date: 'Date',
  url: 'URL',
  email: 'Email',
}

export function DatasetUploader({
  open,
  onOpenChange,
  onDatasetCreated,
  existingDatasetNames,
}: DatasetUploaderProps) {
  const [state, setState] = useState<UploadState>('idle')
  const [activeTab, setActiveTab] = useState('upload')
  const [dragActive, setDragActive] = useState(false)
  const [pastedContent, setPastedContent] = useState('')
  const [datasetName, setDatasetName] = useState('')
  const [parseResult, setParseResult] = useState<ParseCSVResult>({} as ParseCSVResult)
  const [columnTypes, setColumnTypes] = useState<ColumnType[]>([])
  const [nameError, setNameError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setState('idle')
    setParseResult({} as ParseCSVResult)
    setColumnTypes([])
    setPastedContent('')
    setDatasetName('')
    setNameError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        resetState()
      }
      onOpenChange(open)
    },
    [onOpenChange, resetState]
  )

  const parseContent = useCallback((content: string) => {
    setState('parsing')
    const result = parseCSV(content)
    setParseResult(result)
    if (result.success && result.columns && result.rows) {
      // Infer column types from the data
      const inferred = inferColumnTypes(result.columns, result.rows)
      setColumnTypes(inferred)
      setState('previewing')
    } else {
      setColumnTypes([])
      setState('error')
    }
  }, [])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      const files = e.dataTransfer.files
      if (files && files[0]) {
        const file = files[0]
        // Auto-fill dataset name from filename
        const name = file.name.replace(/\.(csv|txt)$/i, '')
        setDatasetName(name)
        const content = await file.text()
        parseContent(content)
      }
    },
    [parseContent]
  )

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files[0]) {
        const file = files[0]
        // Auto-fill dataset name from filename
        const name = file.name.replace(/\.(csv|txt)$/i, '')
        setDatasetName(name)
        const content = await file.text()
        parseContent(content)
      }
    },
    [parseContent]
  )

  const handlePasteSubmit = useCallback(() => {
    if (!pastedContent.trim()) return
    parseContent(pastedContent.trim())
  }, [pastedContent, parseContent])

  const validateName = useCallback(
    (name: string): string | null => {
      const trimmed = name.trim()
      if (!trimmed) return 'Dataset name is required'
      if (trimmed.length > 50) return 'Name must be 50 characters or less'
      if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
        return 'Name can only contain letters, numbers, spaces, hyphens, and underscores'
      }
      if (existingDatasetNames.includes(trimmed)) {
        return 'A dataset with this name already exists'
      }
      return null
    },
    [existingDatasetNames]
  )

  const handleCreate = useCallback(() => {
    const error = validateName(datasetName)
    if (error) {
      setNameError(error)
      return
    }

    if (!parseResult.success || !parseResult.columns || !parseResult.rows) {
      return
    }

    const dataset: Dataset = {
      id: generateDatasetId(),
      name: datasetName.trim(),
      columns: parseResult.columns,
      columnTypes: columnTypes,
      rows: parseResult.rows,
      createdAt: new Date().toISOString(),
    }

    onDatasetCreated(dataset)
    handleOpenChange(false)
  }, [datasetName, parseResult, columnTypes, validateName, onDatasetCreated, handleOpenChange])

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const name = e.target.value
      setDatasetName(name)
      setNameError(validateName(name))
    },
    [validateName]
  )

  const handleColumnTypeChange = useCallback((colIndex: number, newType: ColumnType) => {
    setColumnTypes((prev) => {
      const updated = [...prev]
      updated[colIndex] = newType
      return updated
    })
  }, [])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Dataset</DialogTitle>
          <DialogDescription>
            Upload a CSV file or paste CSV content to create a dataset for correlated value
            generation.
          </DialogDescription>
        </DialogHeader>

        {state === 'idle' || state === 'parsing' ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload File</TabsTrigger>
              <TabsTrigger value="paste">Paste CSV</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <div className="flex flex-col items-center gap-3">
                  {state === 'parsing' ? (
                    <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                  ) : (
                    <Upload className="h-10 w-10 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {state === 'parsing' ? 'Parsing...' : 'Drag and drop a CSV file here'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={state === 'parsing'}
                  >
                    Select File
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="paste" className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="csv-content">CSV Content</Label>
                <Textarea
                  id="csv-content"
                  placeholder="name,imageUrl,price&#10;Muffin,https://example.com/muffin.jpg,3.99&#10;Croissant,https://example.com/croissant.jpg,4.50"
                  value={pastedContent}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPastedContent(e.target.value)}
                  className="font-mono text-sm min-h-[200px]"
                />
              </div>
              <Button
                onClick={handlePasteSubmit}
                disabled={!pastedContent.trim() || state === 'parsing'}
              >
                {state === 'parsing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Parse CSV
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        ) : state === 'error' ? (
          <div className="flex-1 space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Failed to parse CSV</p>
                <p className="text-sm mt-1">{parseResult.error}</p>
              </div>
            </div>
            <Button variant="outline" onClick={resetState}>
              <X className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        ) : state === 'previewing' && parseResult.success ? (
          <div className="flex-1 space-y-4 overflow-hidden flex flex-col">
            {/* Dataset name input */}
            <div className="space-y-2">
              <Label htmlFor="dataset-name">Dataset Name</Label>
              <Input
                id="dataset-name"
                placeholder="e.g., bakery-items"
                value={datasetName}
                onChange={handleNameChange}
                className={nameError ? 'border-destructive' : ''}
              />
              {nameError && <p className="text-sm text-destructive">{nameError}</p>}
            </div>

            {/* Stats badges */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{parseResult.columns?.length} columns</Badge>
              <Badge variant="secondary">{parseResult.rows?.length} rows</Badge>
              {parseResult.truncated && (
                <Badge variant="destructive">
                  Truncated from {parseResult.originalRowCount} rows
                </Badge>
              )}
            </div>

            {/* Column Schema */}
            <div className="space-y-2">
              <Label className="block">Column Schema</Label>
              <p className="text-xs text-muted-foreground">
                Types are auto-detected. Click to change if needed.
              </p>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Column</TableHead>
                      <TableHead className="w-[150px]">Type</TableHead>
                      <TableHead>Sample Values</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parseResult.columns?.map((col, colIdx) => {
                      const sampleValues = parseResult.rows
                        ?.slice(0, 3)
                        .map((row) => row[colIdx])
                        .filter((v) => v.trim() !== '')
                        .slice(0, 3)
                      return (
                        <TableRow key={colIdx}>
                          <TableCell className="font-medium">{col}</TableCell>
                          <TableCell>
                            <Select
                              value={columnTypes[colIdx] || 'string'}
                              onValueChange={(value) =>
                                handleColumnTypeChange(colIdx, value as ColumnType)
                              }
                            >
                              <SelectTrigger className="h-8 w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(
                                  Object.entries(COLUMN_TYPE_LABELS) as [ColumnType, string][]
                                ).map(([type, label]) => (
                                  <SelectItem key={type} value={type}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {sampleValues?.join(', ') || '-'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Preview table */}
            <div className="flex-1 overflow-hidden min-h-0">
              <Label className="mb-2 block">Data Preview (first 5 rows)</Label>
              <ScrollArea className="h-[150px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {parseResult.columns?.map((col, i) => (
                        <TableHead key={i} className="whitespace-nowrap">
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parseResult.rows?.slice(0, 5).map((row, rowIdx) => (
                      <TableRow key={rowIdx}>
                        {row.map((cell, cellIdx) => (
                          <TableCell key={cellIdx} className="max-w-[200px] truncate">
                            {cell}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        ) : null}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          {state === 'previewing' && (
            <Button onClick={handleCreate} disabled={!!nameError || !datasetName.trim()}>
              <Check className="mr-2 h-4 w-4" />
              Create Dataset
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
