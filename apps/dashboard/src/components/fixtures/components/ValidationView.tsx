import { useMemo, useState } from 'react'
import type { ValidationResult, ValidationError, ValidationWarning } from './types'

interface ValidationViewProps {
  validation?: ValidationResult
  onRevalidate?: () => void
}

interface ValidationCheck {
  name: string
  description: string
  passed: boolean
  count?: number
  errors?: ValidationError[]
  warnings?: ValidationWarning[]
  /** If true, the check was skipped (not performed) */
  skipped?: boolean
  /** Reason the check was skipped */
  skipReason?: string
}

export function ValidationView({ validation, onRevalidate }: ValidationViewProps) {
  // Build validation checks from stats and errors/warnings
  const checks = useMemo<ValidationCheck[]>(() => {
    if (!validation) return []

    const { stats, errors, warnings } = validation

    // Group errors by type
    const errorsByType = errors.reduce((acc, err) => {
      acc[err.type] = acc[err.type] || []
      acc[err.type].push(err)
      return acc
    }, {} as Record<string, ValidationError[]>)

    // Group warnings by type
    const warningsByType = warnings.reduce((acc, warn) => {
      acc[warn.type] = acc[warn.type] || []
      acc[warn.type].push(warn)
      return acc
    }, {} as Record<string, ValidationWarning[]>)

    const checkList: ValidationCheck[] = []

    // Type validation check
    const typeErrors = [
      ...(errorsByType['type_mismatch'] || []),
      ...(errorsByType['format_invalid'] || []),
    ]
    const typeCheckSkipped = stats.typeChecks === 0
    checkList.push({
      name: 'Type validation',
      description: typeCheckSkipped
        ? 'Skipped'
        : `${stats.typeChecks} type checks performed`,
      passed: typeErrors.length === 0,
      count: stats.typeChecks,
      errors: typeErrors.length > 0 ? typeErrors : undefined,
      skipped: typeCheckSkipped,
      skipReason: typeCheckSkipped
        ? 'No type definitions in schema'
        : undefined,
    })

    // Relationship validation check
    const relationshipErrors = errorsByType['missing_reference'] || []
    const relationshipCheckSkipped = stats.relationshipsChecked === 0
    checkList.push({
      name: 'Relationship integrity',
      description: relationshipCheckSkipped
        ? 'Skipped'
        : `${stats.relationshipsChecked} foreign key references validated`,
      passed: relationshipErrors.length === 0,
      count: stats.relationshipsChecked,
      errors: relationshipErrors.length > 0 ? relationshipErrors : undefined,
      skipped: relationshipCheckSkipped,
      skipReason: relationshipCheckSkipped
        ? 'No relationships detected in schema'
        : undefined,
    })

    // Required fields check
    const requiredErrors = errorsByType['required_missing'] || []
    checkList.push({
      name: 'Required fields',
      description: 'All required fields have values',
      passed: requiredErrors.length === 0,
      errors: requiredErrors.length > 0 ? requiredErrors : undefined,
    })

    // Unique IDs check
    const duplicateErrors = errorsByType['duplicate_id'] || []
    checkList.push({
      name: 'Unique identifiers',
      description: 'No duplicate IDs across records',
      passed: duplicateErrors.length === 0,
      errors: duplicateErrors.length > 0 ? duplicateErrors : undefined,
    })

    // Enum validation check
    const enumErrors = errorsByType['enum_invalid'] || []
    if (enumErrors.length > 0 || stats.typeChecks > 0) {
      checkList.push({
        name: 'Enum constraints',
        description: 'All enum fields contain valid values',
        passed: enumErrors.length === 0,
        errors: enumErrors.length > 0 ? enumErrors : undefined,
      })
    }

    // Timestamp ordering check
    const timestampErrors = errorsByType['timestamp_order'] || []
    checkList.push({
      name: 'Timestamp ordering',
      description: 'createdAt precedes updatedAt',
      passed: timestampErrors.length === 0,
      errors: timestampErrors.length > 0 ? timestampErrors : undefined,
    })

    // Constraint validation (min/max/pattern)
    const constraintErrors = errorsByType['constraint_violation'] || []
    if (constraintErrors.length > 0) {
      checkList.push({
        name: 'Value constraints',
        description: 'Values within min/max/pattern constraints',
        passed: false,
        errors: constraintErrors,
      })
    }

    // Orphaned records warning
    const orphanedWarnings = warningsByType['orphaned_record'] || []
    if (orphanedWarnings.length > 0) {
      checkList.push({
        name: 'Orphaned records',
        description: `${orphanedWarnings.length} records not referenced`,
        passed: true, // It's a warning, not an error
        warnings: orphanedWarnings,
      })
    }

    // Missing optional fields warning
    const missingOptionalWarnings = warningsByType['missing_optional'] || []
    if (missingOptionalWarnings.length > 0) {
      checkList.push({
        name: 'Optional fields',
        description: `${missingOptionalWarnings.length} optional fields are empty`,
        passed: true, // It's a warning, not an error
        warnings: missingOptionalWarnings,
      })
    }

    // Empty string warnings
    const emptyStringWarnings = warningsByType['empty_string'] || []
    if (emptyStringWarnings.length > 0) {
      checkList.push({
        name: 'Empty strings',
        description: `${emptyStringWarnings.length} string fields are empty`,
        passed: true, // It's a warning, not an error
        warnings: emptyStringWarnings,
      })
    }

    // Suspicious value warnings (model not in schema)
    const suspiciousWarnings = warningsByType['suspicious_value'] || []
    if (suspiciousWarnings.length > 0) {
      checkList.push({
        name: 'Suspicious values',
        description: `${suspiciousWarnings.length} unexpected values found`,
        passed: true, // It's a warning, not an error
        warnings: suspiciousWarnings,
      })
    }

    return checkList
  }, [validation])

  if (!validation) {
    return (
      <p className="text-muted-foreground">
        No validation results available
      </p>
    )
  }

  const passedCount = checks.filter(c => c.passed && !c.warnings && !c.skipped).length
  const skippedCount = checks.filter(c => c.skipped).length
  const warningCount = checks.filter(c => c.warnings && c.warnings.length > 0).length
  const failedCount = checks.filter(c => !c.passed && !c.skipped).length

  return (
    <div className="space-y-4">
      {/* Summary line */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          {failedCount === 0 ? (
            <span className="text-success font-medium">All checks passed</span>
          ) : (
            <span className="text-destructive font-medium">{failedCount} check{failedCount !== 1 ? 's' : ''} failed</span>
          )}
          <span className="text-muted-foreground">
            {validation.stats.totalRecords} records · {validation.stats.durationMs}ms
          </span>
        </div>
        {onRevalidate && (
          <button
            type="button"
            onClick={onRevalidate}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Re-run
          </button>
        )}
      </div>

      {/* Test-like results */}
      <div className="font-mono text-sm space-y-3">
        {checks.map((check, index) => (
          <CheckRow key={index} check={check} />
        ))}
      </div>

      {/* Summary stats */}
      <div className="pt-2 border-t border-border">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="text-success">{passedCount} passed</span>
          {skippedCount > 0 && <span>{skippedCount} skipped</span>}
          {warningCount > 0 && <span className="text-warning">{warningCount} warnings</span>}
          {failedCount > 0 && <span className="text-destructive">{failedCount} failed</span>}
          <span>{checks.length} total</span>
        </div>
      </div>
    </div>
  )
}

function CheckRow({ check }: { check: ValidationCheck }) {
  const [errorsExpanded, setErrorsExpanded] = useState(false)
  const [warningsExpanded, setWarningsExpanded] = useState(false)

  const hasMoreErrors = (check.errors?.length ?? 0) > 3
  const hasMoreWarnings = (check.warnings?.length ?? 0) > 3

  const displayedErrors = errorsExpanded ? check.errors : check.errors?.slice(0, 3)
  const displayedWarnings = warningsExpanded ? check.warnings : check.warnings?.slice(0, 3)

  return (
    <div className="space-y-1">
      <div className="flex items-start gap-2">
        {/* Status icon */}
        {check.skipped ? (
          <span className="text-muted-foreground">–</span>
        ) : check.passed ? (
          check.warnings && check.warnings.length > 0 ? (
            <span className="text-warning">⚠</span>
          ) : (
            <span className="text-success">✓</span>
          )
        ) : (
          <span className="text-destructive">✗</span>
        )}
        {/* Check name and description - stacked layout */}
        <div className="flex-1 min-w-0">
          <div className={check.skipped ? 'text-muted-foreground' : check.passed ? 'text-foreground' : 'text-destructive'}>
            {check.name}
          </div>
          <div className="text-muted-foreground text-xs">
            {check.skipped && check.skipReason ? check.skipReason : check.description}
          </div>
        </div>
      </div>

      {/* Show errors inline if failed */}
      {check.errors && check.errors.length > 0 && (
        <div className="ml-5 space-y-1">
          {displayedErrors?.map((error, i) => (
            <div key={i} className="text-xs text-destructive/80">
              └ {error.model}.{error.field}: {error.message}
            </div>
          ))}
          {hasMoreErrors && (
            <button
              type="button"
              onClick={() => setErrorsExpanded(!errorsExpanded)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              └ {errorsExpanded ? 'Show less' : `...and ${check.errors.length - 3} more`}
            </button>
          )}
        </div>
      )}

      {/* Show warnings inline */}
      {check.warnings && check.warnings.length > 0 && (
        <div className="ml-5 space-y-1">
          {displayedWarnings?.map((warning, i) => (
            <div key={i} className="text-xs text-warning/80">
              └ {warning.model}.{warning.field}: {warning.message}
            </div>
          ))}
          {hasMoreWarnings && (
            <button
              type="button"
              onClick={() => setWarningsExpanded(!warningsExpanded)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              └ {warningsExpanded ? 'Show less' : `...and ${check.warnings.length - 3} more`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
