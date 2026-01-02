/**
 * QuickStatsRow Component
 *
 * Displays key metrics about the project in a horizontal row.
 * Shows model count, endpoint count, relationship count, and fixture count.
 * Clicking a stat card opens a Sheet with detailed information.
 */

'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Database,
  Route,
  GitBranch,
  FileJson,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Hash,
  ArrowRightLeft,
  FileInput,
  FileOutput,
} from 'lucide-react'

// Model type from schema
interface DataModel {
  name: string
  type: string
  description?: string
  properties?: Record<string, {
    name: string
    type: string
    format?: string
    required?: boolean
    description?: string
  }>
  required?: string[]
}

// Parameter definition from schema
interface ParameterDef {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie'
  required: boolean
  type: string
  format?: string
  description?: string
  example?: unknown
}

// Request body from schema
interface RequestBody {
  contentType: string
  schema: { $ref?: string; name?: string; type?: string }
  required: boolean
  description?: string
}

// Response definition from schema
interface ResponseDef {
  statusCode: string
  description?: string
  content?: Record<string, { $ref?: string; name?: string; type?: string }>
}

// Endpoint type from schema
interface Endpoint {
  method: string
  path: string
  operationId?: string
  summary?: string
  description?: string
  tags: string[]
  pathParams?: ParameterDef[]
  queryParams?: ParameterDef[]
  requestBody?: RequestBody
  responses?: Record<string, ResponseDef>
}

// Relationship type from schema
interface Relationship {
  from: { model: string; field: string }
  to: { model: string; field: string }
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many'
  required: boolean
}

// Fixture type
interface Fixture {
  id: string
  name: string
  status: string | null
  recordCount: number | null
  createdAt: string
}

interface QuickStatsRowProps {
  modelCount: number
  endpointCount: number
  relationshipCount: number
  fixtureCount: number
  // Actual data for sheets
  models?: Record<string, DataModel>
  endpoints?: Endpoint[]
  relationships?: Relationship[]
  fixtures?: Fixture[]
  loading?: boolean
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>
  value: number
  label: string
  onClick?: () => void
  loading?: boolean
}

function StatCard({ icon: Icon, value, label, onClick, loading }: StatCardProps) {
  if (loading) {
    return (
      <Card className="flex-1">
        <CardContent className="pt-4 pb-4 text-center">
          <Skeleton className="h-8 w-12 mx-auto mb-1" />
          <Skeleton className="h-3 w-16 mx-auto" />
        </CardContent>
      </Card>
    )
  }

  const isClickable = !!onClick && value > 0

  return (
    <Card
      className={`flex-1 transition-all ${
        isClickable
          ? 'hover:bg-muted/30 hover:border-primary/30 cursor-pointer group'
          : 'opacity-70'
      }`}
      onClick={isClickable ? onClick : undefined}
    >
      <CardContent className="pt-4 pb-4 text-center relative">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${isClickable ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className="text-2xl font-semibold tabular-nums">{value}</span>
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
        {isClickable && (
          <ChevronRight className="h-3 w-3 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </CardContent>
    </Card>
  )
}

// Method color mapping
const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-500/10 text-green-600 border-green-500/30',
  POST: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  PUT: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  PATCH: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  DELETE: 'bg-red-500/10 text-red-600 border-red-500/30',
}

// Response status code color mapping
const STATUS_COLORS: Record<string, string> = {
  '2': 'text-green-600', // 2xx success
  '3': 'text-blue-600',  // 3xx redirect
  '4': 'text-yellow-600', // 4xx client error
  '5': 'text-red-600',   // 5xx server error
}

// Helper to extract model name from $ref
function extractRefName(ref: string): string {
  const parts = ref.split('/')
  return parts[parts.length - 1] ?? ref
}

// Relationship type labels
const RELATIONSHIP_LABELS: Record<string, string> = {
  'one-to-one': '1:1',
  'one-to-many': '1:n',
  'many-to-one': 'n:1',
  'many-to-many': 'n:n',
}

type TabType = 'models' | 'endpoints' | 'relationships' | 'fixtures'

export function QuickStatsRow({
  modelCount,
  endpointCount,
  relationshipCount,
  fixtureCount,
  models = {},
  endpoints = [],
  relationships = [],
  fixtures = [],
  loading = false,
}: QuickStatsRowProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('models')

  const modelList = Object.values(models)

  // Helper to open sheet with specific tab
  const openSheetWithTab = (tab: TabType) => {
    setActiveTab(tab)
    setSheetOpen(true)
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={Database}
          value={modelCount}
          label="Models"
          onClick={() => openSheetWithTab('models')}
          loading={loading}
        />
        <StatCard
          icon={Route}
          value={endpointCount}
          label="Endpoints"
          onClick={() => openSheetWithTab('endpoints')}
          loading={loading}
        />
        <StatCard
          icon={GitBranch}
          value={relationshipCount}
          label="Relationships"
          onClick={() => openSheetWithTab('relationships')}
          loading={loading}
        />
        <StatCard
          icon={FileJson}
          value={fixtureCount}
          label="Fixtures"
          onClick={() => openSheetWithTab('fixtures')}
          loading={loading}
        />
      </div>

      {/* Unified Schema Explorer Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" open={sheetOpen} className="sm:max-w-lg overflow-hidden flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-0">
            <SheetTitle>Schema Explorer</SheetTitle>
            <SheetDescription>Models, endpoints, relationships & fixtures</SheetDescription>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="flex-1 flex flex-col overflow-hidden">
            <TabsList variant="underline" className="px-6 justify-start shrink-0">
              <TabsTrigger value="models" className="text-xs">
                <Database className="h-3.5 w-3.5 mr-1.5" />
                Models ({modelCount})
              </TabsTrigger>
              <TabsTrigger value="endpoints" className="text-xs">
                <Route className="h-3.5 w-3.5 mr-1.5" />
                Endpoints ({endpointCount})
              </TabsTrigger>
              <TabsTrigger value="relationships" className="text-xs">
                <GitBranch className="h-3.5 w-3.5 mr-1.5" />
                Relations ({relationshipCount})
              </TabsTrigger>
              <TabsTrigger value="fixtures" className="text-xs">
                <FileJson className="h-3.5 w-3.5 mr-1.5" />
                Fixtures ({fixtureCount})
              </TabsTrigger>
            </TabsList>

            {/* Models Tab */}
            <TabsContent value="models" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
              <div className="space-y-4">
                {modelList.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No models defined in schema
                  </p>
                ) : (
                  modelList.map((model) => {
                    const propCount = Object.keys(model.properties || {}).length
                    const requiredCount = model.required?.length || 0

                    return (
                      <div key={model.name} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{model.name}</h4>
                            {model.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {model.description}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {model.type}
                          </Badge>
                        </div>

                        {propCount > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-muted-foreground mb-2">
                              {propCount} properties ({requiredCount} required)
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {Object.values(model.properties || {}).slice(0, 6).map((prop) => (
                                <Badge
                                  key={prop.name}
                                  variant="secondary"
                                  className="text-xs gap-1"
                                >
                                  {prop.required && <span className="text-destructive">*</span>}
                                  {prop.name}
                                  <span className="text-muted-foreground">: {prop.type}</span>
                                </Badge>
                              ))}
                              {propCount > 6 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{propCount - 6} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </TabsContent>

            {/* Endpoints Tab */}
            <TabsContent value="endpoints" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
              <div className="space-y-3">
                {endpoints.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No endpoints defined in schema
                  </p>
                ) : (
                  endpoints.map((endpoint, index) => {
                    const hasDetails =
                      (endpoint.pathParams && endpoint.pathParams.length > 0) ||
                      (endpoint.queryParams && endpoint.queryParams.length > 0) ||
                      endpoint.requestBody ||
                      (endpoint.responses && Object.keys(endpoint.responses).length > 0) ||
                      endpoint.description

                    return (
                      <Collapsible key={`${endpoint.method}-${endpoint.path}-${index}`}>
                        <div className="border rounded-lg overflow-hidden">
                          <CollapsibleTrigger className="w-full p-3 hover:bg-muted/30 transition-colors text-left">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`text-xs font-mono shrink-0 ${METHOD_COLORS[endpoint.method] || ''}`}
                              >
                                {endpoint.method}
                              </Badge>
                              <code className="text-sm font-mono truncate flex-1">
                                {endpoint.path}
                              </code>
                              {hasDetails && (
                                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                              )}
                            </div>
                            {endpoint.summary && (
                              <p className="text-xs text-muted-foreground mt-1 text-left">
                                {endpoint.summary}
                              </p>
                            )}
                            {endpoint.tags.length > 0 && (
                              <div className="flex gap-1 mt-2">
                                {endpoint.tags.map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="border-t px-3 py-3 space-y-4 bg-muted/10">
                              {/* Description */}
                              {endpoint.description && (
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    {endpoint.description}
                                  </p>
                                </div>
                              )}

                              {/* Path Parameters */}
                              {endpoint.pathParams && endpoint.pathParams.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs font-medium">Path Parameters</span>
                                  </div>
                                  <div className="space-y-1.5">
                                    {endpoint.pathParams.map((param) => (
                                      <div key={param.name} className="flex items-start gap-2 text-xs">
                                        <code className="font-mono bg-muted px-1.5 py-0.5 rounded shrink-0">
                                          {param.required && <span className="text-destructive">*</span>}
                                          {param.name}
                                        </code>
                                        <span className="text-muted-foreground">
                                          {param.type}{param.format && ` (${param.format})`}
                                        </span>
                                        {param.description && (
                                          <span className="text-muted-foreground/70 truncate">
                                            — {param.description}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Query Parameters */}
                              {endpoint.queryParams && endpoint.queryParams.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs font-medium">Query Parameters</span>
                                  </div>
                                  <div className="space-y-1.5">
                                    {endpoint.queryParams.map((param) => (
                                      <div key={param.name} className="flex items-start gap-2 text-xs">
                                        <code className="font-mono bg-muted px-1.5 py-0.5 rounded shrink-0">
                                          {param.required && <span className="text-destructive">*</span>}
                                          {param.name}
                                        </code>
                                        <span className="text-muted-foreground">
                                          {param.type}{param.format && ` (${param.format})`}
                                        </span>
                                        {param.description && (
                                          <span className="text-muted-foreground/70 truncate">
                                            — {param.description}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Request Body */}
                              {endpoint.requestBody && (
                                <div>
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <FileInput className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs font-medium">Request Body</span>
                                    {endpoint.requestBody.required && (
                                      <span className="text-xs text-destructive">required</span>
                                    )}
                                  </div>
                                  <div className="text-xs space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {endpoint.requestBody.contentType}
                                      </Badge>
                                      {endpoint.requestBody.schema.$ref && (
                                        <span className="font-mono text-primary">
                                          {extractRefName(endpoint.requestBody.schema.$ref)}
                                        </span>
                                      )}
                                      {endpoint.requestBody.schema.name && (
                                        <span className="font-mono text-primary">
                                          {endpoint.requestBody.schema.name}
                                        </span>
                                      )}
                                    </div>
                                    {endpoint.requestBody.description && (
                                      <p className="text-muted-foreground">
                                        {endpoint.requestBody.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Responses */}
                              {endpoint.responses && Object.keys(endpoint.responses).length > 0 && (
                                <div>
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <FileOutput className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs font-medium">Responses</span>
                                  </div>
                                  <div className="space-y-1.5">
                                    {Object.entries(endpoint.responses).map(([statusCode, response]) => {
                                      const statusClass = STATUS_COLORS[statusCode[0]] || 'text-muted-foreground'
                                      const firstContent = response.content ? Object.values(response.content)[0] : null

                                      return (
                                        <div key={statusCode} className="flex items-start gap-2 text-xs">
                                          <code className={`font-mono font-semibold shrink-0 ${statusClass}`}>
                                            {statusCode}
                                          </code>
                                          {response.description && (
                                            <span className="text-muted-foreground">
                                              {response.description}
                                            </span>
                                          )}
                                          {firstContent && (firstContent.$ref || firstContent.name) && (
                                            <span className="font-mono text-primary/80">
                                              → {firstContent.$ref ? extractRefName(firstContent.$ref) : firstContent.name}
                                            </span>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Operation ID */}
                              {endpoint.operationId && (
                                <div className="pt-2 border-t">
                                  <span className="text-xs text-muted-foreground">
                                    Operation: <code className="font-mono">{endpoint.operationId}</code>
                                  </span>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    )
                  })
                )}
              </div>
            </TabsContent>

            {/* Relationships Tab */}
            <TabsContent value="relationships" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
              <div className="space-y-3">
                {relationships.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No relationships detected
                  </p>
                ) : (
                  relationships.map((rel, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        {/* From side */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="secondary" className="text-xs">
                            {rel.from.model}
                          </Badge>
                          <span className="text-xs text-muted-foreground">.{rel.from.field}</span>
                        </div>

                        {/* Arrow with label above */}
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <span className="text-[10px] font-medium text-muted-foreground/70 tabular-nums">
                            {RELATIONSHIP_LABELS[rel.type]}
                          </span>
                          <div className="flex items-center justify-center">
                            <div className="w-6 h-px bg-muted-foreground/30" />
                            <ArrowRight className="h-3 w-3 text-muted-foreground/50 -mx-1" />
                            <div className="w-6 h-px bg-muted-foreground/30" />
                          </div>
                        </div>

                        {/* To side */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs text-muted-foreground">.{rel.to.field}</span>
                          <Badge variant="secondary" className="text-xs">
                            {rel.to.model}
                          </Badge>
                        </div>
                      </div>
                      {rel.required && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Required relationship
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Fixtures Tab */}
            <TabsContent value="fixtures" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
              <div className="space-y-3">
                {fixtures.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No fixtures created yet
                  </p>
                ) : (
                  fixtures.map((fixture) => (
                    <div key={fixture.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-sm">{fixture.name}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {fixture.recordCount ?? 0} records
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {fixture.status && (
                            <Badge
                              variant={fixture.status === 'ready' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {fixture.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Created {new Date(fixture.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  )
}
