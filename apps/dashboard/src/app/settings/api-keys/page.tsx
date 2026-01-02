'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Key,
  Sparkles,
  Globe,
  Brain,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'

// Storage keys for BYOK configuration
const STORAGE_KEYS = {
  anthropicKey: 'demokit-anthropic-key',
  voyageKey: 'demokit-voyage-key',
  openaiKey: 'demokit-openai-key',
  firecrawlKey: 'demokit-firecrawl-key',
  embeddingProvider: 'demokit-embedding-provider',
  claudeModel: 'demokit-claude-model',
}

type EmbeddingProvider = 'voyage' | 'openai'
type ClaudeModel = 'claude-sonnet-4-20250514' | 'claude-3-5-haiku-20241022' | 'claude-opus-4-20250514'

interface ApiKeyConfig {
  key: string
  isValid: boolean | null
  lastValidated: Date | null
}

const PROVIDERS = {
  anthropic: {
    name: 'Anthropic',
    icon: Brain,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    description: 'Required for L3 AI-powered fixture generation',
    placeholder: 'sk-ant-api...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  voyage: {
    name: 'Voyage AI',
    icon: Globe,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    description: 'For code embeddings and semantic search',
    placeholder: 'pa-...',
    docsUrl: 'https://dash.voyageai.com/api-keys',
  },
  openai: {
    name: 'OpenAI',
    icon: Sparkles,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    description: 'Alternative embedding provider',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  firecrawl: {
    name: 'Firecrawl',
    icon: Globe,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    description: 'For web scraping during app intelligence',
    placeholder: 'fc-...',
    docsUrl: 'https://firecrawl.dev/app/api-keys',
  },
}

const CLAUDE_MODELS = [
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Recommended)' },
  { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Faster)' },
  { value: 'claude-opus-4-20250514', label: 'Claude Opus 4 (Most Capable)' },
]

export default function ApiKeysSettingsPage() {
  const [isHydrated, setIsHydrated] = useState(false)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [validating, setValidating] = useState<Record<string, boolean>>({})

  // API Key states
  const [anthropicKey, setAnthropicKey] = useState('')
  const [voyageKey, setVoyageKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [firecrawlKey, setFirecrawlKey] = useState('')
  const [embeddingProvider, setEmbeddingProvider] = useState<EmbeddingProvider>('voyage')
  const [claudeModel, setClaudeModel] = useState<ClaudeModel>('claude-sonnet-4-20250514')

  // Validation states
  const [keyStatus, setKeyStatus] = useState<Record<string, boolean | null>>({
    anthropic: null,
    voyage: null,
    openai: null,
    firecrawl: null,
  })

  // Load from localStorage on mount
  useEffect(() => {
    setAnthropicKey(localStorage.getItem(STORAGE_KEYS.anthropicKey) || '')
    setVoyageKey(localStorage.getItem(STORAGE_KEYS.voyageKey) || '')
    setOpenaiKey(localStorage.getItem(STORAGE_KEYS.openaiKey) || '')
    setFirecrawlKey(localStorage.getItem(STORAGE_KEYS.firecrawlKey) || '')
    setEmbeddingProvider(
      (localStorage.getItem(STORAGE_KEYS.embeddingProvider) as EmbeddingProvider) || 'voyage'
    )
    setClaudeModel(
      (localStorage.getItem(STORAGE_KEYS.claudeModel) as ClaudeModel) || 'claude-sonnet-4-20250514'
    )
    setIsHydrated(true)
  }, [])

  // Save key to localStorage
  const saveKey = useCallback((provider: string, value: string) => {
    const storageKey = STORAGE_KEYS[`${provider}Key` as keyof typeof STORAGE_KEYS]
    if (storageKey) {
      localStorage.setItem(storageKey, value)
      toast.success(`${PROVIDERS[provider as keyof typeof PROVIDERS]?.name || provider} API key saved`)
    }
  }, [])

  // Validate API key (mock validation - would need actual API calls)
  const validateKey = useCallback(async (provider: string, key: string) => {
    if (!key) {
      setKeyStatus((prev) => ({ ...prev, [provider]: null }))
      return
    }

    setValidating((prev) => ({ ...prev, [provider]: true }))

    // Simulate validation (in production, this would call the actual API)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Basic format validation
    const isValid = key.length > 10 && (
      (provider === 'anthropic' && key.startsWith('sk-ant-')) ||
      (provider === 'voyage' && key.startsWith('pa-')) ||
      (provider === 'openai' && key.startsWith('sk-')) ||
      (provider === 'firecrawl' && key.startsWith('fc-')) ||
      // Allow any key for flexibility
      key.length > 20
    )

    setKeyStatus((prev) => ({ ...prev, [provider]: isValid }))
    setValidating((prev) => ({ ...prev, [provider]: false }))

    if (isValid) {
      toast.success(`${PROVIDERS[provider as keyof typeof PROVIDERS]?.name} key validated`)
    } else {
      toast.error(`Invalid ${PROVIDERS[provider as keyof typeof PROVIDERS]?.name} key format`)
    }
  }, [])

  // Toggle key visibility
  const toggleKeyVisibility = (provider: string) => {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }))
  }

  // Mask key for display
  const maskKey = (key: string) => {
    if (!key) return ''
    if (key.length <= 8) return '••••••••'
    return `${key.slice(0, 7)}...${key.slice(-4)}`
  }

  // Handle embedding provider change
  const handleEmbeddingProviderChange = (value: EmbeddingProvider) => {
    setEmbeddingProvider(value)
    localStorage.setItem(STORAGE_KEYS.embeddingProvider, value)
    toast.success(`Embedding provider set to ${value === 'voyage' ? 'Voyage AI' : 'OpenAI'}`)
  }

  // Handle Claude model change
  const handleClaudeModelChange = (value: ClaudeModel) => {
    setClaudeModel(value)
    localStorage.setItem(STORAGE_KEYS.claudeModel, value)
    toast.success('Claude model preference saved')
  }

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-muted-foreground mt-1">
            Configure your API keys for AI-powered features
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-10 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API Keys</h1>
        <p className="text-muted-foreground mt-1">
          Configure your API keys for AI-powered features (BYOK - Bring Your Own Key)
        </p>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50 p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-800 dark:text-blue-200">
              Your keys are stored locally
            </p>
            <p className="text-blue-700 dark:text-blue-300 mt-1">
              API keys are saved in your browser&apos;s localStorage and never sent to any server.
              They are used directly for API calls to the respective providers.
            </p>
          </div>
        </div>
      </div>

      {/* Anthropic (Required for L3) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${PROVIDERS.anthropic.bgColor}`}>
                <PROVIDERS.anthropic.icon className={`h-4 w-4 ${PROVIDERS.anthropic.color}`} />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {PROVIDERS.anthropic.name}
                  <Badge variant="outline" className="text-xs">Required for L3</Badge>
                </CardTitle>
                <CardDescription>{PROVIDERS.anthropic.description}</CardDescription>
              </div>
            </div>
            {keyStatus.anthropic !== null && (
              <Badge variant={keyStatus.anthropic ? 'default' : 'destructive'}>
                {keyStatus.anthropic ? (
                  <><Check className="h-3 w-3 mr-1" /> Valid</>
                ) : (
                  <><X className="h-3 w-3 mr-1" /> Invalid</>
                )}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="anthropic-key">API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="anthropic-key"
                  type={showKeys.anthropic ? 'text' : 'password'}
                  value={anthropicKey}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnthropicKey(e.target.value)}
                  placeholder={PROVIDERS.anthropic.placeholder}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => toggleKeyVisibility('anthropic')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKeys.anthropic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                variant="outline"
                onClick={() => validateKey('anthropic', anthropicKey)}
                disabled={validating.anthropic || !anthropicKey}
              >
                {validating.anthropic ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Test'
                )}
              </Button>
              <Button onClick={() => saveKey('anthropic', anthropicKey)} disabled={!anthropicKey}>
                Save
              </Button>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Get your key from</span>
              <a
                href={PROVIDERS.anthropic.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Anthropic Console <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="claude-model">Claude Model</Label>
            <Select value={claudeModel} onValueChange={handleClaudeModelChange}>
              <SelectTrigger id="claude-model">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {CLAUDE_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Model used for L3 narrative-driven fixture generation
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Embedding Provider */}
      <Card>
        <CardHeader>
          <CardTitle>Embedding Provider</CardTitle>
          <CardDescription>Choose your provider for code embeddings and semantic search</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="embedding-provider">Provider</Label>
            <Select value={embeddingProvider} onValueChange={handleEmbeddingProviderChange}>
              <SelectTrigger id="embedding-provider">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="voyage">Voyage AI (Recommended for code)</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Voyage AI Key */}
          {embeddingProvider === 'voyage' && (
            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded ${PROVIDERS.voyage.bgColor}`}>
                  <PROVIDERS.voyage.icon className={`h-3 w-3 ${PROVIDERS.voyage.color}`} />
                </div>
                <Label htmlFor="voyage-key">{PROVIDERS.voyage.name} API Key</Label>
                {keyStatus.voyage !== null && (
                  <Badge variant={keyStatus.voyage ? 'default' : 'destructive'} className="text-xs">
                    {keyStatus.voyage ? 'Valid' : 'Invalid'}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="voyage-key"
                    type={showKeys.voyage ? 'text' : 'password'}
                    value={voyageKey}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVoyageKey(e.target.value)}
                    placeholder={PROVIDERS.voyage.placeholder}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleKeyVisibility('voyage')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKeys.voyage ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => validateKey('voyage', voyageKey)}
                  disabled={validating.voyage || !voyageKey}
                >
                  {validating.voyage ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test'}
                </Button>
                <Button onClick={() => saveKey('voyage', voyageKey)} disabled={!voyageKey}>
                  Save
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Get your key from</span>
                <a
                  href={PROVIDERS.voyage.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Voyage AI Dashboard <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          {/* OpenAI Key */}
          {embeddingProvider === 'openai' && (
            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded ${PROVIDERS.openai.bgColor}`}>
                  <PROVIDERS.openai.icon className={`h-3 w-3 ${PROVIDERS.openai.color}`} />
                </div>
                <Label htmlFor="openai-key">{PROVIDERS.openai.name} API Key</Label>
                {keyStatus.openai !== null && (
                  <Badge variant={keyStatus.openai ? 'default' : 'destructive'} className="text-xs">
                    {keyStatus.openai ? 'Valid' : 'Invalid'}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="openai-key"
                    type={showKeys.openai ? 'text' : 'password'}
                    value={openaiKey}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOpenaiKey(e.target.value)}
                    placeholder={PROVIDERS.openai.placeholder}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleKeyVisibility('openai')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKeys.openai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => validateKey('openai', openaiKey)}
                  disabled={validating.openai || !openaiKey}
                >
                  {validating.openai ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test'}
                </Button>
                <Button onClick={() => saveKey('openai', openaiKey)} disabled={!openaiKey}>
                  Save
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Get your key from</span>
                <a
                  href={PROVIDERS.openai.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  OpenAI Platform <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Firecrawl (Optional) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${PROVIDERS.firecrawl.bgColor}`}>
                <PROVIDERS.firecrawl.icon className={`h-4 w-4 ${PROVIDERS.firecrawl.color}`} />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {PROVIDERS.firecrawl.name}
                  <Badge variant="secondary" className="text-xs">Optional</Badge>
                </CardTitle>
                <CardDescription>{PROVIDERS.firecrawl.description}</CardDescription>
              </div>
            </div>
            {keyStatus.firecrawl !== null && (
              <Badge variant={keyStatus.firecrawl ? 'default' : 'destructive'}>
                {keyStatus.firecrawl ? (
                  <><Check className="h-3 w-3 mr-1" /> Valid</>
                ) : (
                  <><X className="h-3 w-3 mr-1" /> Invalid</>
                )}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firecrawl-key">API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="firecrawl-key"
                  type={showKeys.firecrawl ? 'text' : 'password'}
                  value={firecrawlKey}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirecrawlKey(e.target.value)}
                  placeholder={PROVIDERS.firecrawl.placeholder}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => toggleKeyVisibility('firecrawl')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKeys.firecrawl ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                variant="outline"
                onClick={() => validateKey('firecrawl', firecrawlKey)}
                disabled={validating.firecrawl || !firecrawlKey}
              >
                {validating.firecrawl ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Test'
                )}
              </Button>
              <Button onClick={() => saveKey('firecrawl', firecrawlKey)} disabled={!firecrawlKey}>
                Save
              </Button>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Get your key from</span>
              <a
                href={PROVIDERS.firecrawl.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Firecrawl Dashboard <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
            Without Firecrawl, the app intelligence feature will use basic fetch-based scraping,
            which may not work well for JavaScript-heavy sites.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
