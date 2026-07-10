'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Check, Copy, Database, ExternalLink } from 'lucide-react'
import { Stagger, FadeIn } from '@/components/ui/motion'
import type { ProjectData, WizardResult } from './types'

const PROVIDER_SNIPPET = `import { DemoKitProvider } from '@demokit-ai/react'
import { fixtures } from './demo.fixtures' // ← copied below

export function App() {
  return (
    <DemoKitProvider fixtures={fixtures}>
      <YourApp />
    </DemoKitProvider>
  )
}`

/** Fallback fixture example built from the user's real endpoints */
function endpointExample(data: ProjectData): string {
  const endpoints = (data.schema?.endpoints ?? [])
    .filter((e) => e.method === 'GET')
    .slice(0, 2)
  if (endpoints.length === 0) {
    return `const fixtures = {\n  'GET /api/users': () => [{ id: '1', name: 'Demo User' }],\n}`
  }
  const lines = endpoints.map((e) => {
    const pattern = e.path.replace(/\{([^}]+)\}/g, ':$1')
    return `  '${e.method} ${pattern}': () => [/* your demo data */],`
  })
  return `const fixtures = {\n${lines.join('\n')}\n}`
}

function useCopy() {
  const [copied, setCopied] = useState(false)
  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])
  return { copied, copy }
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const { copied, copy } = useCopy()
  return (
    <Button variant="outline" size="sm" onClick={() => copy(text)}>
      {copied ? <Check className="mr-1.5 size-3.5" /> : <Copy className="mr-1.5 size-3.5" />}
      {copied ? 'Copied' : label}
    </Button>
  )
}

interface CompleteStepProps {
  data: ProjectData
  result: WizardResult | null
}

/**
 * Step 4 — end on the value moment: the data that was just generated and a
 * quick start personalized with it. Everything shown here is real — the
 * fixture file is the actual generated module, not boilerplate.
 */
export function CompleteStep({ data, result }: CompleteStepProps) {
  const fixtures = result?.fixtures ?? []
  const firstCode = fixtures.find((f) => f.code)?.code

  return (
    <Stagger className="space-y-8">
      <FadeIn>
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-success/10">
            <Check className="size-7 text-success" />
          </div>
          <h1 className="font-display-serif text-3xl tracking-tight">
            {fixtures.length > 0 ? 'Your demo data is ready' : 'Project created'}
          </h1>
          <p className="mt-2 text-muted-foreground">{data.name}</p>
        </div>
      </FadeIn>

      {/* What was generated — the reward */}
      {fixtures.length > 0 && (
        <FadeIn>
          <div className="space-y-3">
            {fixtures.map((fixture, i) => {
              const models = Object.entries(fixture.recordsByModel)
              return (
                <div key={fixture.fixtureId} className="rounded-xl border p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500">
                      <Database className="size-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{fixture.fixtureName}</span>
                        {i === 0 && (
                          <Badge variant="secondary" className="text-[10px]">
                            Active fixture
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {fixture.totalRecords} records generated
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {models.slice(0, 4).map(([model, count]) => (
                          <Badge key={model} variant="outline" className="text-[10px]">
                            {count} {model}
                          </Badge>
                        ))}
                        {models.length > 4 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{models.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </FadeIn>
      )}

      {/* Quick start — personalized, not boilerplate */}
      <FadeIn>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Quick start</h2>
            <CopyButton
              text={`npm install @demokit-ai/core @demokit-ai/react`}
              label="Copy install"
            />
          </div>
          <div className="overflow-x-auto rounded-xl bg-foreground p-4">
            <pre className="text-sm text-background">
              <code>{firstCode ? PROVIDER_SNIPPET : `${PROVIDER_SNIPPET}\n\n${endpointExample(data)}`}</code>
            </pre>
          </div>
        </div>
      </FadeIn>

      {/* The actual generated fixture module */}
      {firstCode && (
        <FadeIn>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium">demo.fixtures.ts</h2>
                <p className="text-xs text-muted-foreground">
                  Generated from your schema — paste it straight into your app
                </p>
              </div>
              <CopyButton text={firstCode} label="Copy file" />
            </div>
            <div className="max-h-64 overflow-auto rounded-xl bg-foreground p-4">
              <pre className="text-xs text-background">
                <code>{firstCode}</code>
              </pre>
            </div>
          </div>
        </FadeIn>
      )}

      <FadeIn>
        <div className="flex gap-3 border-t pt-5">
          <Link href="/projects" className="flex-1">
            <Button variant="outline" className="w-full">
              Back to projects
            </Button>
          </Link>
          {result && (
            <Link href={`/projects/${result.projectId}`} className="flex-1">
              <Button className="w-full">
                Open project
                {fixtures.length > 0 ? (
                  <ExternalLink className="ml-2 h-4 w-4" />
                ) : (
                  <ArrowRight className="ml-2 h-4 w-4" />
                )}
              </Button>
            </Link>
          )}
        </div>
      </FadeIn>
    </Stagger>
  )
}
