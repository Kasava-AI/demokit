'use client'

/**
 * HostedApiSection Component
 *
 * Manages hosted API access for fixtures:
 * - Fixture selector dropdown
 * - Enable/disable toggle
 * - API key display with copy and regenerate
 * - Example request code
 * - Real-time API call logs
 */

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Copy, RefreshCw, Check, Eye, EyeOff } from 'lucide-react'
import { CodeBlock } from '@/components/export/CodeBlock'
import { ApiCallLogs } from './ApiCallLogs'
import { useHostedApi } from '@/hooks/use-hosted-api'
import type { FixtureWithRelations } from '@/hooks/use-fixtures'

interface HostedApiSectionProps {
  projectId: string
  fixtures: FixtureWithRelations[]
  selectedFixtureId?: string
  onSelectFixture: (fixtureId: string) => void
}

export function HostedApiSection({
  projectId,
  fixtures,
  selectedFixtureId,
  onSelectFixture,
}: HostedApiSectionProps) {
  const [showApiKey, setShowApiKey] = useState(false)
  const [copied, setCopied] = useState<'endpoint' | 'apiKey' | null>(null)

  // Get hosted API state for the selected fixture
  const {
    apiKey,
    hostedEnabled,
    isLoading,
    isEnabling,
    isRegeneratingKey,
    toggleHosted,
    regenerateApiKey,
  } = useHostedApi(selectedFixtureId)

  // Copy to clipboard handler
  const handleCopy = useCallback(async (text: string, type: 'endpoint' | 'apiKey') => {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }, [])

  // Build the endpoint URL
  const endpoint = 'https://api.demokit.ai/v1/fixtures'

  // Generate curl example
  const curlExample = apiKey
    ? `curl ${endpoint} \\
  -H "Authorization: Bearer ${showApiKey ? apiKey : 'dk_live_••••••••••••'}" \\
  -H "Content-Type: application/json"`
    : `# Enable hosted API to get your API key`

  // Mask API key for display
  const maskedApiKey = apiKey
    ? showApiKey
      ? apiKey
      : `${apiKey.slice(0, 12)}••••••••••••`
    : 'Not generated'

  return (
    <div className="space-y-6">
      {/* Fixture Selector */}
      {fixtures.length > 1 && (
        <div className="flex items-center gap-4">
          <Label htmlFor="fixture-select" className="text-sm font-medium">
            Fixture
          </Label>
          <Select value={selectedFixtureId} onValueChange={onSelectFixture}>
            <SelectTrigger id="fixture-select" className="w-64">
              <SelectValue placeholder="Select a fixture" />
            </SelectTrigger>
            <SelectContent>
              {fixtures.map((fixture) => (
                <SelectItem key={fixture.id} value={fixture.id}>
                  {fixture.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* API Access Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">API Access</CardTitle>
              <CardDescription className="text-sm">
                Enable to serve this fixture via our hosted API
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={hostedEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => toggleHosted(!hostedEnabled)}
                disabled={isLoading || isEnabling}
              >
                {isEnabling ? 'Updating...' : hostedEnabled ? 'Disable' : 'Enable'}
              </Button>
              {hostedEnabled ? (
                <Badge variant="default" className="bg-green-600">
                  Enabled
                </Badge>
              ) : (
                <Badge variant="secondary">Disabled</Badge>
              )}
            </div>
          </div>
        </CardHeader>

        {hostedEnabled && (
          <CardContent className="space-y-4">
            {/* Endpoint */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Endpoint
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono">
                  {endpoint}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(endpoint, 'endpoint')}
                >
                  {copied === 'endpoint' ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                API Key
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono">
                  {maskedApiKey}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowApiKey(!showApiKey)}
                  disabled={!apiKey}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => apiKey && handleCopy(apiKey, 'apiKey')}
                  disabled={!apiKey}
                >
                  {copied === 'apiKey' ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={regenerateApiKey}
                  disabled={isRegeneratingKey}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${isRegeneratingKey ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Keep your API key secret. If compromised, regenerate it immediately.
              </p>
            </div>

            {/* Example Request */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Example Request
              </Label>
              <CodeBlock code={curlExample} language="bash" />
            </div>
          </CardContent>
        )}
      </Card>

      {/* API Call Logs */}
      {hostedEnabled && selectedFixtureId && (
        <ApiCallLogs fixtureId={selectedFixtureId} projectId={projectId} />
      )}
    </div>
  )
}
