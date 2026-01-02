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
  | 'remix'
  | 'tanstack-query'
  | 'swr'
  | 'trpc'

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
    case 'remix':
      return generateRemixCode(mode, fixturesData, projectName, apiEndpoint)
    case 'tanstack-query':
      return generateTanStackQueryCode(mode, fixturesData, projectName, apiEndpoint)
    case 'swr':
      return generateSWRCode(mode, fixturesData, projectName, apiEndpoint)
    case 'trpc':
      return generateTRPCCode(mode, fixturesData, projectName, apiEndpoint)
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

function generateRemixCode(
  mode: IntegrationMode,
  fixturesData: string,
  projectName: string,
  apiEndpoint: string
): GeneratedCode {
  const install = 'npm install @demokit-ai/remix @demokit-ai/core'

  const fixtures = mode === 'local'
    ? `// app/lib/fixtures.ts
import type { DemoData } from '@demokit-ai/core';

export const ${projectName.toLowerCase()}Fixtures: DemoData = ${fixturesData};`
    : `// app/lib/demokit-config.ts
export const demokitConfig = {
  apiEndpoint: '${apiEndpoint}',
  apiKey: process.env.DEMOKIT_API_KEY,
};`

  const provider = `// app/routes/users.tsx
import { createDemoLoader } from '@demokit-ai/remix';
import { ${projectName.toLowerCase()}Fixtures } from '~/lib/fixtures';

export const loader = createDemoLoader(
  async ({ request }) => {
    // Your real loader logic
    const users = await db.user.findMany();
    return json({ users });
  },
  {
    fixtures: ${projectName.toLowerCase()}Fixtures,
    path: 'users',
  }
);`

  const usage = `// app/root.tsx
import { DemoKitProvider, useDemoMode } from '@demokit-ai/remix';

export default function App() {
  return (
    <DemoKitProvider>
      <Outlet />
    </DemoKitProvider>
  );
}

// Toggle demo mode via URL: ?demo=true
// Or programmatically:
function DemoToggle() {
  const { isDemoMode, setDemoMode } = useDemoMode();
  return (
    <button onClick={() => setDemoMode(!isDemoMode)}>
      Toggle Demo
    </button>
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
  const install = 'npm install @demokit-ai/tanstack-query @demokit-ai/core @tanstack/react-query'

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
import { DemoKitQueryProvider } from '@demokit-ai/tanstack-query';
import { ${projectName.toLowerCase()}Fixtures } from './lib/fixtures';

const queryClient = new QueryClient();

export function App({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <DemoKitQueryProvider fixtures={${projectName.toLowerCase()}Fixtures}>
        {children}
      </DemoKitQueryProvider>
    </QueryClientProvider>
  );
}`

  const usage = `// src/hooks/useUsers.ts
import { useQuery } from '@tanstack/react-query';

// Your existing queries work unchanged!
// DemoKit intercepts based on queryKey patterns
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(res => res.json()),
  });
}

// Toggle demo mode:
import { useDemoMode } from '@demokit-ai/tanstack-query';

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
  const install = 'npm install @demokit-ai/swr @demokit-ai/core swr'

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
import { SWRConfig } from 'swr';
import { createDemoMiddleware } from '@demokit-ai/swr';
import { ${projectName.toLowerCase()}Fixtures } from './lib/fixtures';

const demoMiddleware = createDemoMiddleware(${projectName.toLowerCase()}Fixtures);

export function App({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{ use: [demoMiddleware] }}>
      {children}
    </SWRConfig>
  );
}`

  const usage = `// src/hooks/useUsers.ts
import useSWR from 'swr';

// Your existing SWR hooks work unchanged!
// DemoKit intercepts based on URL patterns
export function useUsers() {
  return useSWR('/api/users', (url) => fetch(url).then(res => res.json()));
}

// Toggle demo mode:
import { useDemoMode } from '@demokit-ai/swr';

function DemoToggle() {
  const { isDemoMode, setDemoMode } = useDemoMode();
  return <button onClick={() => setDemoMode(!isDemoMode)}>Toggle</button>;
}`

  return { install, fixtures, provider, usage }
}

function generateTRPCCode(
  mode: IntegrationMode,
  fixturesData: string,
  projectName: string,
  apiEndpoint: string
): GeneratedCode {
  const install = 'npm install @demokit-ai/trpc @demokit-ai/core @trpc/client @trpc/react-query'

  const fixtures = mode === 'local'
    ? `// src/lib/fixtures.ts
import type { DemoData } from '@demokit-ai/core';

export const ${projectName.toLowerCase()}Fixtures: DemoData = ${fixturesData};`
    : `// src/lib/demokit-config.ts
export const demokitConfig = {
  apiEndpoint: '${apiEndpoint}',
  apiKey: import.meta.env.VITE_DEMOKIT_API_KEY,
};`

  const provider = `// src/lib/trpc.ts
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createDemoLink } from '@demokit-ai/trpc';
import { ${projectName.toLowerCase()}Fixtures } from './fixtures';
import type { AppRouter } from '../server/router';

const demoLink = createDemoLink<AppRouter>(${projectName.toLowerCase()}Fixtures);

export const trpc = createTRPCClient<AppRouter>({
  links: [
    demoLink,
    httpBatchLink({ url: '/api/trpc' }),
  ],
});`

  const usage = `// src/components/UserList.tsx
import { trpc } from '../lib/trpc';

// Your existing tRPC queries work unchanged!
// DemoKit intercepts based on procedure names
function UserList() {
  const { data: users } = trpc.users.list.useQuery();
  return (
    <ul>
      {users?.map(user => <li key={user.id}>{user.name}</li>)}
    </ul>
  );
}

// Toggle demo mode via localStorage:
localStorage.setItem('demo-mode', 'true');
// Then reload the page`

  return { install, fixtures, provider, usage }
}
