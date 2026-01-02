'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CardTitle as CT, CardDescription } from '@/components/ui/card'
import { ArrowLeft, Check, Copy, ExternalLink } from 'lucide-react'
import type { ProjectData } from './types'

interface CompleteStepProps {
  data: ProjectData
  createdProjectId: string | null
}

const INSTALL_CODE = `npm install @demokit-ai/core @demokit-ai/react

// In your app:
import { DemoKitProvider } from '@demokit-ai/react'

const fixtures = {
  'GET /api/users': () => [
    { id: '1', name: 'Demo User' }
  ],
}

function App() {
  return (
    <DemoKitProvider fixtures={fixtures}>
      <YourApp />
    </DemoKitProvider>
  )
}`

export function CompleteStep({ data, createdProjectId }: CompleteStepProps) {
  const [copied, setCopied] = useState(false)
  const projectId = createdProjectId || data.projectKey

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(projectId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [projectId])

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
          <Check className="h-8 w-8 text-success" />
        </div>
        <CT className="text-2xl">Project Created!</CT>
        <CardDescription className="mt-2 text-lg">{data.name}</CardDescription>
      </div>

      {/* Project Key */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Your Project ID</p>
              <code className="text-lg font-mono">{projectId}</code>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {data.intelligence && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Intelligence Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{data.intelligence.features.length}</p>
              <p className="text-sm text-muted-foreground">Features</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{data.intelligence.journeys.length}</p>
              <p className="text-sm text-muted-foreground">Journeys</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{data.intelligence.templates.length}</p>
              <p className="text-sm text-muted-foreground">Templates</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Start */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Quick Start</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-foreground rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-background">
              <code>{INSTALL_CODE}</code>
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Link href="/projects" className="flex-1">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
        <Link href={`/projects/${projectId}`} className="flex-1">
          <Button className="w-full">
            Open Project
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
