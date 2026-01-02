import type { FixtureMap, FixtureHandler } from '@demokit-ai/core'
import type { ReactNode } from 'react'
import type { NextResponse } from 'next/server'

/**
 * Configuration for DemoKit Next.js integration
 */
export interface DemoKitNextConfig {
  /**
   * Map of URL patterns to fixture handlers
   */
  fixtures: FixtureMap

  /**
   * Available scenarios with their fixtures
   */
  scenarios?: Record<string, FixtureMap>

  /**
   * localStorage key for persisting demo mode state
   * @default 'demokit-mode'
   */
  storageKey?: string

  /**
   * Cookie name for server-side demo mode detection
   * @default 'demokit-mode'
   */
  cookieName?: string

  /**
   * URL parameter to enable/disable demo mode
   * @default 'demo'
   */
  urlParam?: string

  /**
   * Base URL to use for relative URL parsing
   * @default process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
   */
  baseUrl?: string
}

/**
 * Props for DemoKitNextProvider
 */
export interface DemoKitNextProviderProps extends DemoKitNextConfig {
  /**
   * Child components
   */
  children: ReactNode

  /**
   * Initial enabled state
   * If not provided, will read from cookie/localStorage
   */
  initialEnabled?: boolean
}

/**
 * Configuration for createDemoMiddleware
 */
export interface DemoMiddlewareConfig {
  /**
   * Cookie name for demo mode
   * @default 'demokit-mode'
   */
  cookieName?: string

  /**
   * URL parameter to toggle demo mode
   * @default 'demo'
   */
  urlParam?: string

  /**
   * Header to set for API routes when in demo mode
   * @default 'x-demokit-mode'
   */
  headerName?: string

  /**
   * Paths that should have demo mode header set
   * @default ['/api/']
   */
  apiPaths?: string[]

  /**
   * Cookie options
   */
  cookieOptions?: {
    maxAge?: number
    path?: string
    sameSite?: 'strict' | 'lax' | 'none'
    secure?: boolean
  }
}

/**
 * Result of middleware processing
 */
export interface MiddlewareResult {
  /**
   * Whether demo mode is enabled
   */
  isDemoMode: boolean

  /**
   * The scenario name if set
   */
  scenario: string | null

  /**
   * The response to return (may have cookies set)
   */
  response: NextResponse
}

/**
 * Scenario definition for Next.js
 */
export interface DemoScenario {
  /**
   * Scenario name
   */
  name: string

  /**
   * Scenario description
   */
  description?: string

  /**
   * Fixtures for this scenario
   */
  fixtures: FixtureMap
}

/**
 * Helper type for defining fixtures with type safety
 */
export type DefineFixtures<T extends Record<string, FixtureHandler>> = T

/**
 * Helper type for defining scenarios with type safety
 */
export type DefineScenarios<T extends Record<string, FixtureMap>> = T
