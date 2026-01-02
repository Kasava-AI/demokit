/**
 * Utility functions for FixtureDetail
 */

import type { ExportFormat } from './types';

export function formatValue(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return value.length > 50 ? value.slice(0, 50) + '...' : value
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export const FORMAT_OPTIONS: {
  value: ExportFormat;
  label: string;
  extension: string;
}[] = [
  { value: "typescript", label: "TypeScript", extension: "ts" },
  { value: "json", label: "JSON", extension: "json" },
  { value: "sql", label: "SQL", extension: "sql" },
  { value: "csv", label: "CSV", extension: "csv" },
];
