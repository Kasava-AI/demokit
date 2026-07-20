import type { Framework } from '../types'
import { getFixturesPath } from './fixtures'

/**
 * Generate the provider wrapper component content for a given framework.
 */
export function generateProviderFile(framework: Framework): string {
  const fixturesPath = getFixturesPath(framework)
  const fixturesImport = fixturesPath.replace(/\.ts$/, '').replace(/^(src|app|lib)\//, '@/')

  switch (framework) {
    case 'react':
      return generateReactProvider(fixturesImport)
  }
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
    case 'react':
      return 'src/demo/providers.tsx'
  }
}
