export type Framework = 'react'

/** Frameworks we still detect, to fail with a helpful message instead of silently mis-wiring */
export type UnsupportedFramework =
  | 'next'
  | 'remix'
  | 'react-router'
  | 'tanstack-query'
  | 'swr'
  | 'trpc'

export type GenerationLevel = 'l1' | 'l2'

export type PackageManager = 'pnpm' | 'yarn' | 'bun' | 'npm'

export interface CliOptions {
  directory: string
  yes: boolean
  cloud: boolean
  framework?: Framework
  level: GenerationLevel
  dryRun: boolean
  noInstall: boolean
  noWire: boolean
  verbose: boolean
}

export interface DetectionResult {
  framework: Framework | UnsupportedFramework
  confidence: 'high' | 'medium' | 'low'
  evidence: string[]
}

export interface ExistingInstallation {
  packages: string[]
  hasCore: boolean
  hasAdapter: boolean
  isComplete: boolean
}

export interface ScanResult {
  endpoints: DetectedEndpoint[]
  models: string[]
  files: string[]
}

export interface DetectedEndpoint {
  method: string
  path: string
  source: 'api-route' | 'fetch-call' | 'schema'
  responseHint?: string
}

export interface FileChange {
  path: string
  action: 'created' | 'modified' | 'skipped'
  description: string
}

export interface CliResult {
  packagesInstalled: string[]
  filesChanged: FileChange[]
  endpointsDetected: number
  framework: Framework
}
