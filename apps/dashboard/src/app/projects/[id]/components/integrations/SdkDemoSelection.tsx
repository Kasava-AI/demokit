'use client'

/**
 * SdkDemoSelection Component
 *
 * Shows published demos with SDK code examples for dynamic demo selection.
 * Features:
 * - List of published demos with variants
 * - SDK code snippets for Core SDK, React, and Next.js
 * - Copy-to-clipboard for all code examples
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Check,
  ChevronDown,
  Copy,
  Code2,
  Sparkles,
  Package,
  Layers,
} from 'lucide-react'
import { useDemos, type DemoWithRelations } from '@/hooks/use-demos'

interface SdkDemoSelectionProps {
  projectId: string
}

function CodeBlock({
  code,
  language = 'typescript',
}: {
  code: string
  language?: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group">
      <pre className="bg-muted/50 border rounded-lg p-4 overflow-x-auto text-sm">
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}

function DemoCard({ demo }: { demo: DemoWithRelations }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasVariants = demo.variants && demo.variants.length > 0
  const defaultVariant = demo.variants?.[0]

  // Generate SDK code examples
  const coreSdkCode = `import { DemoKit } from '@demokit/sdk'

const demo = new DemoKit({
  projectId: '${demo.projectId}',
  apiKey: process.env.DEMOKIT_API_KEY,
})

// Load default variant
await demo.load('${demo.slug}')

// Or load a specific variant
${hasVariants && defaultVariant ? `await demo.load('${demo.slug}:${defaultVariant.slug}')` : `// await demo.load('${demo.slug}:variant-name')`}

// Access data
const users = demo.data.users
const orders = demo.data.orders`

  const reactCode = `import { DemoProvider, useDemoData, DemoSwitcher } from '@demokit/react'

function App() {
  return (
    <DemoProvider
      projectId="${demo.projectId}"
      apiKey={process.env.NEXT_PUBLIC_DEMOKIT_API_KEY}
      defaultDemo="${demo.slug}"
    >
      <DemoSwitcher />
      <MyApp />
    </DemoProvider>
  )
}

function ProductList() {
  const { products, isLoading } = useDemoData()

  if (isLoading) return <Loading />

  return products.map(p => <Product key={p.id} {...p} />)
}`

  const nextjsCode = `// middleware.ts
import { withDemoMode } from '@demokit/next'

export default withDemoMode({
  projectId: '${demo.projectId}',
  apiKey: process.env.DEMOKIT_API_KEY,
  routes: {
    '/demo/${demo.slug}': '${demo.slug}',
${hasVariants && demo.variants ? demo.variants.slice(0, 2).map(v => `    '/demo/${demo.slug}/${v.slug}': '${demo.slug}:${v.slug}',`).join('\n') : ''}
  },
  // Also support query param: ?demo=${demo.slug}
  queryParam: 'demo',
})`

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="rounded-lg border bg-card">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-start gap-3 p-4 text-left">
            <div className="p-2 rounded-md bg-primary/10 shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{demo.name}</span>
                <Badge variant="outline" className="text-xs font-mono">
                  {demo.slug}
                </Badge>
                {demo.isPublished && (
                  <Badge variant="default" className="text-xs">
                    Published
                  </Badge>
                )}
              </div>
              {demo.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                  {demo.description}
                </p>
              )}
              {hasVariants && (
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Layers className="h-3 w-3" />
                  <span>{demo.variants!.length} variant{demo.variants!.length !== 1 ? 's' : ''}</span>
                  <span className="mx-1">·</span>
                  {demo.variants!.slice(0, 3).map((v) => (
                    <Badge key={v.id} variant="secondary" className="text-xs font-mono">
                      {v.slug}
                    </Badge>
                  ))}
                  {demo.variants!.length > 3 && (
                    <span className="text-muted-foreground">+{demo.variants!.length - 3} more</span>
                  )}
                </div>
              )}
            </div>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 border-t mx-4 pt-4">
            <Tabs defaultValue="core" className="w-full">
              <TabsList className="mb-3">
                <TabsTrigger value="core" className="gap-1.5">
                  <Code2 className="h-3.5 w-3.5" />
                  Core SDK
                </TabsTrigger>
                <TabsTrigger value="react" className="gap-1.5">
                  <Package className="h-3.5 w-3.5" />
                  React
                </TabsTrigger>
                <TabsTrigger value="nextjs" className="gap-1.5">
                  <Package className="h-3.5 w-3.5" />
                  Next.js
                </TabsTrigger>
              </TabsList>

              <TabsContent value="core" className="mt-0">
                <CodeBlock code={coreSdkCode} />
              </TabsContent>

              <TabsContent value="react" className="mt-0">
                <CodeBlock code={reactCode} />
              </TabsContent>

              <TabsContent value="nextjs" className="mt-0">
                <CodeBlock code={nextjsCode} />
              </TabsContent>
            </Tabs>

            {/* Variants list */}
            {hasVariants && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Available Variants
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {demo.variants!.map((variant) => (
                    <div
                      key={variant.id}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {variant.slug}
                        </Badge>
                        <span className="text-muted-foreground truncate">
                          {variant.name}
                        </span>
                      </div>
                      <code className="text-xs text-muted-foreground">
                        {demo.slug}:{variant.slug}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function DemoCardSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg border">
      <Skeleton className="h-8 w-8 rounded-md shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}

export function SdkDemoSelection({ projectId }: SdkDemoSelectionProps) {
  const { data: demos, isLoading, error } = useDemos(projectId)

  // Filter to only published demos
  const publishedDemos = demos?.filter((d) => d.isPublished) || []

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">SDK Demo Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DemoCardSkeleton />
          <DemoCardSkeleton />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">SDK Demo Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Failed to load demos: {error.message}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (publishedDemos.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">SDK Demo Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <Sparkles className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No published demos yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Create and publish a demo to enable SDK selection
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          SDK Demo Selection ({publishedDemos.length})
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Select and load demos dynamically at runtime using the DemoKit SDK
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {publishedDemos.map((demo) => (
          <DemoCard key={demo.id} demo={demo} />
        ))}
      </CardContent>
    </Card>
  )
}
