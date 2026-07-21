import type { Framework, Transport } from '../types'
import { getFixturesPath } from './fixtures'

/**
 * Generate the provider wrapper component content for a given framework.
 *
 * `transport` defaults to `'fetch'` — the same default `@demokit-ai/react`
 * itself uses — so a call site that doesn't pass it (or passes `'fetch'`
 * explicitly) produces byte-identical output to before msw scaffolding
 * existed. Only `transport: 'msw'` changes the generated file.
 */
export function generateProviderFile(framework: Framework, transport: Transport = 'fetch'): string {
  const fixturesPath = getFixturesPath(framework)
  const fixturesImport = fixturesPath.replace(/\.ts$/, '').replace(/^(src|app|lib)\//, '@/')

  switch (framework) {
    case 'react':
      return generateReactProvider(fixturesImport, transport)
  }
}

function generateReactProvider(fixturesImport: string, transport: Transport): string {
  if (transport === 'msw') {
    return `import { DemoKitProvider, DemoModeBanner } from '@demokit-ai/react'
import { fixtures } from '${fixturesImport}'

export function DemoKitProviders({ children }: { children: React.ReactNode }) {
  return (
    <DemoKitProvider
      fixtures={fixtures}
      transport="msw"
      // mswOptions={{ workerUrl: '/mockServiceWorker.js' }}
    >
      <DemoModeBanner />
      {children}
    </DemoKitProvider>
  )
}
`
  }

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
    case 'react':
      return 'src/demo/providers.tsx'
  }
}
