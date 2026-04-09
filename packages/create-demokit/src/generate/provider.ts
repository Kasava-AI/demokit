import type { Framework } from '../types'
import { getFixturesPath } from './fixtures'

/**
 * Generate the provider wrapper component content for a given framework.
 */
export function generateProviderFile(framework: Framework): string {
  const fixturesPath = getFixturesPath(framework)
  const fixturesImport = fixturesPath.replace(/\.ts$/, '').replace(/^(src|app|lib)\//, '@/')

  switch (framework) {
    case 'next':
      return generateNextProvider(fixturesImport)
    case 'remix':
      return generateRemixProvider(fixturesImport)
    case 'react-router':
      return generateReactRouterProvider(fixturesImport)
    case 'tanstack-query':
      return generateTanstackProvider(fixturesImport)
    case 'swr':
      return generateSwrProvider(fixturesImport)
    case 'trpc':
      return generateTrpcProvider(fixturesImport)
    case 'react':
      return generateReactProvider(fixturesImport)
  }
}

function generateNextProvider(fixturesImport: string): string {
  return `'use client'

import { DemoKitNextProvider } from '@demokit-ai/next/client'
import { DemoModeBanner } from '@demokit-ai/react'
import { fixtures } from '${fixturesImport}'

export function DemoKitProviders({ children }: { children: React.ReactNode }) {
  return (
    <DemoKitNextProvider
      fixtures={fixtures}
      cookieName="demokit-demo-mode"
    >
      <DemoModeBanner />
      {children}
    </DemoKitNextProvider>
  )
}
`
}

function generateRemixProvider(fixturesImport: string): string {
  return `import { DemoKitProvider, DemoModeBanner } from '@demokit-ai/react'
import { fixtures } from '${fixturesImport}'

export function DemoKitProviders({ children }: { children: React.ReactNode }) {
  return (
    <DemoKitProvider fixtures={fixtures}>
      <DemoModeBanner />
      {children}
    </DemoKitProvider>
  )
}
`
}

function generateReactRouterProvider(fixturesImport: string): string {
  return `import { DemoKitProvider, DemoModeBanner } from '@demokit-ai/react'
import { fixtures } from '${fixturesImport}'

export function DemoKitProviders({ children }: { children: React.ReactNode }) {
  return (
    <DemoKitProvider fixtures={fixtures}>
      <DemoModeBanner />
      {children}
    </DemoKitProvider>
  )
}
`
}

function generateTanstackProvider(fixturesImport: string): string {
  return `import { DemoKitProvider, DemoModeBanner } from '@demokit-ai/react'
import { fixtures } from '${fixturesImport}'

export function DemoKitProviders({ children }: { children: React.ReactNode }) {
  return (
    <DemoKitProvider fixtures={fixtures}>
      <DemoModeBanner />
      {children}
    </DemoKitProvider>
  )
}
`
}

function generateSwrProvider(fixturesImport: string): string {
  return `import { DemoKitProvider, DemoModeBanner } from '@demokit-ai/react'
import { fixtures } from '${fixturesImport}'

export function DemoKitProviders({ children }: { children: React.ReactNode }) {
  return (
    <DemoKitProvider fixtures={fixtures}>
      <DemoModeBanner />
      {children}
    </DemoKitProvider>
  )
}
`
}

function generateTrpcProvider(fixturesImport: string): string {
  return `import { DemoKitProvider, DemoModeBanner } from '@demokit-ai/react'
import { fixtures } from '${fixturesImport}'

export function DemoKitProviders({ children }: { children: React.ReactNode }) {
  return (
    <DemoKitProvider fixtures={fixtures}>
      <DemoModeBanner />
      {children}
    </DemoKitProvider>
  )
}
`
}

function generateReactProvider(fixturesImport: string): string {
  return `import { DemoKitProvider, DemoModeBanner } from '@demokit-ai/react'
import { fixtures } from '${fixturesImport}'

export function DemoKitProviders({ children }: { children: React.ReactNode }) {
  return (
    <DemoKitProvider fixtures={fixtures}>
      <DemoModeBanner />
      {children}
    </DemoKitProvider>
  )
}
`
}

/**
 * Get the path where the provider file should be placed.
 */
export function getProviderPath(framework: Framework): string {
  switch (framework) {
    case 'next':
      return 'app/demo-providers.tsx'
    case 'remix':
    case 'react-router':
      return 'app/demo/providers.tsx'
    default:
      return 'src/demo/providers.tsx'
  }
}
