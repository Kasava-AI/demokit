/**
 * Integration Code Generator
 *
 * Generates framework-specific code snippets for integrating DemoKit
 * into various JavaScript/TypeScript applications.
 */

import type { DemoData } from '@demokit-ai/core'

export type Framework =
  | 'javascript'
  | 'react'
  | 'nextjs'
  | 'tanstack-query'
  | 'swr'

export type IntegrationMode = 'local' | 'remote'

export interface GenerateCodeOptions {
  framework: Framework
  mode: IntegrationMode
  data?: DemoData
  projectName?: string
  includeTypes?: boolean
  apiEndpoint?: string
}

export interface GeneratedCode {
  install: string
  fixtures: string
  provider: string
  usage: string
}

/**
 * Generates integration code for the selected framework and mode
 */
export function generateIntegrationCode(options: GenerateCodeOptions): GeneratedCode {
  const {
    framework,
    mode,
    data,
    projectName = 'Demo',
    apiEndpoint = 'https://api.demokit.ai/v1/fixtures',
  } = options

  // Generate fixtures data string
  const fixturesData = data ? JSON.stringify(data, null, 2) : '{\n  "entities": {},\n  "metadata": {}\n}'

  // Framework-specific code generation
  switch (framework) {
    case 'javascript':
      return generateJavaScriptCode(mode, fixturesData, projectName, apiEndpoint)
    case 'react':
      return generateReactCode(mode, fixturesData, projectName, apiEndpoint)
    case 'nextjs':
      return generateNextJSCode(mode, fixturesData, projectName, apiEndpoint)
    case 'tanstack-query':
      return generateTanStackQueryCode(mode, fixturesData, projectName, apiEndpoint)
    case 'swr':
      return generateSWRCode(mode, fixturesData, projectName, apiEndpoint)
    default:
      return generateReactCode(mode, fixturesData, projectName, apiEndpoint)
  }
}

function generateJavaScriptCode(
  mode: IntegrationMode,
  fixturesData: string,
  projectName: string,
  apiEndpoint: string
): GeneratedCode {
  const install = mode === 'local'
    ? '# No dependencies required for vanilla JavaScript'
    : 'npm install @demokit-ai/core'

  const fixtures = mode === 'local'
    ? `// fixtures.js
export const ${projectName.toLowerCase()}Fixtures = ${fixturesData};`
    : `// config.js
export const DEMOKIT_CONFIG = {
  apiEndpoint: '${apiEndpoint}',
  apiKey: process.env.DEMOKIT_API_KEY,
};`

  const provider = `// demo-fetch.js
import { ${projectName.toLowerCase()}Fixtures } from './fixtures.js';

const isDemoMode = () => localStorage.getItem('demo-mode') === 'true';

export async function demoFetch(url, options) {
  if (isDemoMode()) {
    // Return fixture data based on URL pattern
    const fixtures = ${projectName.toLowerCase()}Fixtures;
    // Match URL to fixture...
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(fixtures),
    });
  }
  return fetch(url, options);
}

export function setDemoMode(enabled) {
  localStorage.setItem('demo-mode', enabled ? 'true' : 'false');
}`

  const usage = `// main.js
import { demoFetch, setDemoMode } from './demo-fetch.js';

// Enable demo mode
setDemoMode(true);

// Use demoFetch instead of fetch
const response = await demoFetch('/api/users');
const users = await response.json();
console.log(users);`

  return { install, fixtures, provider, usage }
}

function generateReactCode(
  mode: IntegrationMode,
  fixturesData: string,
  projectName: string,
  apiEndpoint: string
): GeneratedCode {
  const install = 'npm install @demokit-ai/react @demokit-ai/core'

  const fixtures = mode === 'local'
    ? `// src/fixtures.ts
import type { DemoData } from '@demokit-ai/core';

export const ${projectName.toLowerCase()}Fixtures: DemoData = ${fixturesData};`
    : `// src/config.ts
export const demokitConfig = {
  apiEndpoint: '${apiEndpoint}',
  apiKey: import.meta.env.VITE_DEMOKIT_API_KEY,
};`

  const provider = `// src/App.tsx
import { DemoKitProvider } from '@demokit-ai/react';
import { ${projectName.toLowerCase()}Fixtures } from './fixtures';

export function App({ children }: { children: React.ReactNode }) {
  return (
    <DemoKitProvider
      fixtures={${projectName.toLowerCase()}Fixtures}
      defaultEnabled={false}
    >
      {children}
    </DemoKitProvider>
  );
}`

  const usage = `// src/components/UserList.tsx
import { useDemoMode } from '@demokit-ai/react';

export function UserList() {
  const { isDemoMode, setDemoMode } = useDemoMode();

  return (
    <div>
      <button onClick={() => setDemoMode(!isDemoMode)}>
        {isDemoMode ? 'Exit Demo' : 'Enter Demo'}
      </button>
      {/* Your component content */}
    </div>
  );
}`

  return { install, fixtures, provider, usage }
}

function generateNextJSCode(
  mode: IntegrationMode,
  fixturesData: string,
  projectName: string,
  apiEndpoint: string
): GeneratedCode {
  const install = 'npm install @demokit-ai/react @demokit-ai/core'

  const fixtures = mode === 'local'
    ? `// src/lib/fixtures.ts
import type { DemoData } from '@demokit-ai/core';

export const ${projectName.toLowerCase()}Fixtures: DemoData = ${fixturesData};`
    : `// src/lib/demokit-config.ts
export const demokitConfig = {
  apiEndpoint: '${apiEndpoint}',
  apiKey: process.env.NEXT_PUBLIC_DEMOKIT_API_KEY,
};`

  const provider = `// src/app/providers.tsx
'use client';

import { DemoKitProvider } from '@demokit-ai/react';
import { ${projectName.toLowerCase()}Fixtures } from '@/lib/fixtures';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DemoKitProvider
      fixtures={${projectName.toLowerCase()}Fixtures}
      defaultEnabled={false}
    >
      {children}
    </DemoKitProvider>
  );
}

// src/app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}`

  const usage = `// src/components/DemoToggle.tsx
'use client';

import { useDemoMode, DemoModeBanner } from '@demokit-ai/react';

export function DemoToggle() {
  const { isDemoMode, setDemoMode } = useDemoMode();

  return (
    <>
      {isDemoMode && <DemoModeBanner onExit={() => setDemoMode(false)} />}
      <button onClick={() => setDemoMode(!isDemoMode)}>
        {isDemoMode ? 'Exit Demo Mode' : 'Try Demo'}
      </button>
    </>
  );
}`

  return { install, fixtures, provider, usage }
}

function generateTanStackQueryCode(
  mode: IntegrationMode,
  fixturesData: string,
  projectName: string,
  apiEndpoint: string
): GeneratedCode {
  const install = 'npm install @demokit-ai/react @demokit-ai/core @tanstack/react-query'

  const fixtures = mode === 'local'
    ? `// src/lib/fixtures.ts
import type { DemoData } from '@demokit-ai/core';

export const ${projectName.toLowerCase()}Fixtures: DemoData = ${fixturesData};`
    : `// src/lib/demokit-config.ts
export const demokitConfig = {
  apiEndpoint: '${apiEndpoint}',
  apiKey: import.meta.env.VITE_DEMOKIT_API_KEY,
};`

  const provider = `// src/App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DemoKitProvider } from '@demokit-ai/react';
import { ${projectName.toLowerCase()}Fixtures } from './lib/fixtures';

const queryClient = new QueryClient();

export function App({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <DemoKitProvider fixtures={${projectName.toLowerCase()}Fixtures}>
        {children}
      </DemoKitProvider>
    </QueryClientProvider>
  );
}`

  const usage = `// src/hooks/useUsers.ts
import { useQuery } from '@tanstack/react-query';

// Your existing queries work unchanged, as long as your queryFn calls fetch().
// DemoKit intercepts globalThis.fetch and matches on the request URL — no
// TanStack-specific adapter needed.
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(res => res.json()),
  });
}

// Toggle demo mode:
import { useDemoMode } from '@demokit-ai/react';

function DemoToggle() {
  const { isDemoMode, setDemoMode } = useDemoMode();
  return <button onClick={() => setDemoMode(!isDemoMode)}>Toggle</button>;
}`

  return { install, fixtures, provider, usage }
}

function generateSWRCode(
  mode: IntegrationMode,
  fixturesData: string,
  projectName: string,
  apiEndpoint: string
): GeneratedCode {
  const install = 'npm install @demokit-ai/react @demokit-ai/core swr'

  const fixtures = mode === 'local'
    ? `// src/lib/fixtures.ts
import type { DemoData } from '@demokit-ai/core';

export const ${projectName.toLowerCase()}Fixtures: DemoData = ${fixturesData};`
    : `// src/lib/demokit-config.ts
export const demokitConfig = {
  apiEndpoint: '${apiEndpoint}',
  apiKey: import.meta.env.VITE_DEMOKIT_API_KEY,
};`

  const provider = `// src/App.tsx
import { DemoKitProvider } from '@demokit-ai/react';
import { ${projectName.toLowerCase()}Fixtures } from './lib/fixtures';

export function App({ children }: { children: React.ReactNode }) {
  return (
    <DemoKitProvider fixtures={${projectName.toLowerCase()}Fixtures}>
      {children}
    </DemoKitProvider>
  );
}`

  const usage = `// src/hooks/useUsers.ts
import useSWR from 'swr';

// Your existing SWR hooks work unchanged, as long as your fetcher calls fetch().
// DemoKit intercepts globalThis.fetch and matches on the request URL — no
// SWR-specific adapter needed.
export function useUsers() {
  return useSWR('/api/users', (url) => fetch(url).then(res => res.json()));
}

// Toggle demo mode:
import { useDemoMode } from '@demokit-ai/react';

function DemoToggle() {
  const { isDemoMode, setDemoMode } = useDemoMode();
  return <button onClick={() => setDemoMode(!isDemoMode)}>Toggle</button>;
}`

  return { install, fixtures, provider, usage }
}
