'use client'

/**
 * DatasetManager Component
 *
 * Displays and manages uploaded datasets for a project.
 * Shows dataset list with view/delete actions and linked field counts.
 */

import { useState, useCallback, useMemo } from 'react'
import { Plus, Eye, Trash2, Database, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DatasetUploader } from './DatasetUploader'

// Column types that can be inferred or selected
type ColumnType = 'string' | 'number' | 'integer' | 'boolean' | 'date' | 'url' | 'email'

// Local type definitions matching codegen types
interface Dataset {
  id: string
  name: string
  columns: string[]
  columnTypes?: ColumnType[]
  rows: string[][]
  createdAt: string
  description?: string
}

interface DatasetFieldRule {
  type: 'fromDataset'
  datasetId: string
  column: string
}

type FieldRule =
  | { type: 'string'; strategy: 'oneOf' | 'pattern'; values?: string[]; pattern?: string }
  | { type: 'number'; strategy: 'range' | 'fixed' }
  | { type: 'integer'; strategy: 'range' | 'fixed' }
  | { type: 'boolean'; strategy: 'fixed' | 'weighted' }
  | { type: 'enum'; strategy: 'subset' | 'weighted' }
  | { type: 'array'; minItems?: number; maxItems?: number; uniqueItems?: boolean }
  | DatasetFieldRule

interface DatasetManagerProps {
  datasets: Record<string, Dataset>
  onDatasetsChange: (datasets: Record<string, Dataset>) => void
  fieldRules: Record<string, FieldRule>
  onFieldRulesChange?: (fieldRules: Record<string, FieldRule>) => void
}

export function DatasetManager({
  datasets,
  onDatasetsChange,
  fieldRules,
  onFieldRulesChange,
}: DatasetManagerProps) {
  const [uploaderOpen, setUploaderOpen] = useState(false)
  const [viewingDataset, setViewingDataset] = useState<Dataset | null>(null)
  const [deletingDataset, setDeletingDataset] = useState<Dataset | null>(null)

  // Calculate linked field counts per dataset
  const linkedFieldCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const rule of Object.values(fieldRules)) {
      if (rule.type === 'fromDataset') {
        counts[rule.datasetId] = (counts[rule.datasetId] || 0) + 1
      }
    }
    return counts
  }, [fieldRules])

  // Get linked fields for a dataset (for delete warning)
  const getLinkedFields = useCallback(
    (datasetId: string): string[] => {
      const linked: string[] = []
      for (const [fieldKey, rule] of Object.entries(fieldRules)) {
        if (rule.type === 'fromDataset' && rule.datasetId === datasetId) {
          linked.push(fieldKey)
        }
      }
      return linked
    },
    [fieldRules]
  )

  const handleDatasetCreated = useCallback(
    (dataset: Dataset) => {
      onDatasetsChange({
        ...datasets,
        [dataset.id]: dataset,
      })
    },
    [datasets, onDatasetsChange]
  )

  const handleDeleteDataset = useCallback(
    (dataset: Dataset) => {
      // Remove the dataset
      const newDatasets = { ...datasets }
      delete newDatasets[dataset.id]
      onDatasetsChange(newDatasets)

      // Also remove any field rules that reference this dataset
      if (onFieldRulesChange) {
        const newRules = { ...fieldRules }
        for (const [key, rule] of Object.entries(newRules)) {
          if (rule.type === 'fromDataset' && rule.datasetId === dataset.id) {
            delete newRules[key]
          }
        }
        onFieldRulesChange(newRules)
      }

      setDeletingDataset(null)
    },
    [datasets, onDatasetsChange, fieldRules, onFieldRulesChange]
  )

  const datasetList = Object.values(datasets)
  const existingNames = datasetList.map((d) => d.name)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">Datasets</h3>
          {datasetList.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {datasetList.length}
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setUploaderOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Dataset
        </Button>
      </div>

      {datasetList.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Database className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              No datasets yet. Add a dataset to use correlated values across fields.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setUploaderOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Dataset
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {datasetList.map((dataset) => {
            const linkedCount = linkedFieldCounts[dataset.id] || 0
            return (
              <Card key={dataset.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-sm">{dataset.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {dataset.columns.length} columns, {dataset.rows.length} rows
                        </p>
                      </div>
                      {linkedCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {linkedCount} {linkedCount === 1 ? 'field' : 'fields'} linked
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setViewingDataset(dataset)}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View dataset</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingDataset(dataset)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete dataset</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dataset Uploader Dialog */}
      <DatasetUploader
        open={uploaderOpen}
        onOpenChange={setUploaderOpen}
        onDatasetCreated={handleDatasetCreated}
        existingDatasetNames={existingNames}
      />

      {/* View Dataset Dialog */}
      <Dialog open={!!viewingDataset} onOpenChange={(open) => !open && setViewingDataset(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{viewingDataset?.name}</DialogTitle>
            <DialogDescription>
              {viewingDataset?.columns.length} columns, {viewingDataset?.rows.length} rows
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[60vh] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {viewingDataset?.columns.map((col, i) => (
                    <TableHead key={i} className="whitespace-nowrap">
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewingDataset?.rows.map((row, rowIdx) => (
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingDataset(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingDataset}
        onOpenChange={(open) => !open && setDeletingDataset(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dataset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingDataset?.name}&quot;?
              {deletingDataset && getLinkedFields(deletingDataset.id).length > 0 && (
                <div className="mt-3 p-3 rounded-md bg-destructive/10 text-destructive">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">Warning: This dataset is in use</p>
                      <p className="mt-1">
                        The following fields will have their rules reset to default:
                      </p>
                      <ul className="mt-1 list-disc list-inside">
                        {getLinkedFields(deletingDataset.id).map((field) => (
                          <li key={field}>{field}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingDataset && handleDeleteDataset(deletingDataset)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
