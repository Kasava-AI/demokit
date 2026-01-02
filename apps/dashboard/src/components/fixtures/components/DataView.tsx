'use client'

import { useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DemoData, ExportFormat } from './types'
import { RecordEditor } from './RecordEditor'
import { RecordInspector, type InspectedRecord } from './RecordInspector'
import { ModelExportActions, FORMAT_OPTIONS } from './ModelExportActions'

interface DataViewProps {
  data: DemoData
  expandedModels: Set<string>
  onToggleModel: (model: string) => void
  editable?: boolean
  onFieldChange?: (model: string, index: number, field: string, value: unknown) => void
  onDeleteRecord?: (model: string, index: number) => void
  onDuplicateRecord?: (model: string, index: number) => void
  onAddRecord?: (model: string) => void
  getFormattedContent?: (format: ExportFormat, modelName: string) => string
}

export function DataView({
  data,
  expandedModels,
  onToggleModel,
  editable = false,
  onFieldChange,
  onDeleteRecord,
  onDuplicateRecord,
  onAddRecord,
  getFormattedContent,
}: DataViewProps) {
  const models = Object.entries(data)
  const [inspectedRecord, setInspectedRecord] = useState<InspectedRecord | null>(null)
  const [modelFormats, setModelFormats] = useState<Record<string, ExportFormat>>({})
  const [copiedModel, setCopiedModel] = useState<string | null>(null)

  const getModelFormat = (modelName: string): ExportFormat => modelFormats[modelName] || 'typescript'

  const setModelFormat = (modelName: string, format: ExportFormat) => {
    setModelFormats(prev => ({ ...prev, [modelName]: format }))
  }

  const handleCopyModel = useCallback(async (modelName: string) => {
    if (!getFormattedContent) return
    const content = getFormattedContent(getModelFormat(modelName), modelName)
    await navigator.clipboard.writeText(content)
    setCopiedModel(modelName)
    setTimeout(() => setCopiedModel(null), 2000)
  }, [getFormattedContent, modelFormats])

  const handleDownloadModel = useCallback((modelName: string) => {
    if (!getFormattedContent) return
    const format = getModelFormat(modelName)
    const content = getFormattedContent(format, modelName)
    const formatOption = FORMAT_OPTIONS.find(f => f.value === format)
    const filename = `${modelName.toLowerCase()}.${formatOption?.extension || 'txt'}`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [getFormattedContent, modelFormats])

  return (
    <>
      <div className="space-y-2">
        {models.map(([modelName, records]) => (
          <ModelCard
            key={modelName}
            modelName={modelName}
            records={records as Record<string, unknown>[]}
            isExpanded={expandedModels.has(modelName)}
            onToggle={() => onToggleModel(modelName)}
            editable={editable}
            format={getModelFormat(modelName)}
            onFormatChange={(f) => setModelFormat(modelName, f)}
            onCopy={() => handleCopyModel(modelName)}
            onDownload={() => handleDownloadModel(modelName)}
            isCopied={copiedModel === modelName}
            showExportActions={!!getFormattedContent}
            onAddRecord={onAddRecord ? () => onAddRecord(modelName) : undefined}
            onFieldChange={onFieldChange ? (idx, field, value) => onFieldChange(modelName, idx, field, value) : undefined}
            onDeleteRecord={onDeleteRecord ? (idx) => onDeleteRecord(modelName, idx) : undefined}
            onDuplicateRecord={onDuplicateRecord ? (idx) => onDuplicateRecord(modelName, idx) : undefined}
            onInspect={(idx, rec) => setInspectedRecord({ model: modelName, index: idx, data: rec })}
          />
        ))}
      </div>

      <RecordInspector record={inspectedRecord} onClose={() => setInspectedRecord(null)} />
    </>
  )
}

interface ModelCardProps {
  modelName: string
  records: Record<string, unknown>[]
  isExpanded: boolean
  onToggle: () => void
  editable: boolean
  format: ExportFormat
  onFormatChange: (format: ExportFormat) => void
  onCopy: () => void
  onDownload: () => void
  isCopied: boolean
  showExportActions: boolean
  onAddRecord?: () => void
  onFieldChange?: (index: number, field: string, value: unknown) => void
  onDeleteRecord?: (index: number) => void
  onDuplicateRecord?: (index: number) => void
  onInspect: (index: number, record: Record<string, unknown>) => void
}

function ModelCard({
  modelName,
  records,
  isExpanded,
  onToggle,
  editable,
  format,
  onFormatChange,
  onCopy,
  onDownload,
  isCopied,
  showExportActions,
  onAddRecord,
  onFieldChange,
  onDeleteRecord,
  onDuplicateRecord,
  onInspect,
}: ModelCardProps) {
  const allKeys = records.length > 0
    ? Array.from(new Set(records.flatMap(r => Object.keys(r))))
    : []

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-muted">
        <button type="button" className="flex items-center gap-2 hover:opacity-80" onClick={onToggle}>
          <svg
            className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-medium text-foreground">{modelName}</span>
          <span className="text-sm text-muted-foreground">{records.length} records</span>
        </button>
        <div className="flex items-center gap-2">
          {showExportActions && (
            <ModelExportActions
              format={format}
              onFormatChange={onFormatChange}
              onCopy={onCopy}
              onDownload={onDownload}
              isCopied={isCopied}
            />
          )}
          {editable && onAddRecord && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => { e.stopPropagation(); onAddRecord() }}
              title={`Add new ${modelName} record`}
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border overflow-auto max-h-64">
          {records.length > 0 ? (
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="px-2 py-2 w-10" />
                  {allKeys.map(key => (
                    <th key={key} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {key}
                    </th>
                  ))}
                  {editable && (onDeleteRecord || onDuplicateRecord) && <th className="px-2 py-2 w-16" />}
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {records.map((record, index) => (
                  <RecordEditor
                    key={index}
                    record={record}
                    index={index}
                    modelName={modelName}
                    allKeys={allKeys}
                    editable={editable}
                    onFieldChange={onFieldChange}
                    onDelete={onDeleteRecord}
                    onDuplicate={onDuplicateRecord}
                    onInspect={onInspect}
                  />
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No records. {editable && onAddRecord && (
                <button type="button" className="text-primary hover:text-primary/80" onClick={onAddRecord}>
                  Add one
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
