"use client";

/**
 * IntegrationGuide Component
 *
 * Shows framework-specific installation and usage instructions
 * for integrating DemoKit OSS with the user's application.
 *
 * Supports two modes:
 * - local: Bundle fixtures directly in the app (copy/paste code)
 * - remote: Fetch fixtures from DemoKit Cloud API
 */

import { useState, useMemo, useCallback } from "react";
import { CodeBlock } from "./CodeBlock";
import {
  generateIntegrationCode,
  type Framework,
  type IntegrationMode,
} from "@/lib/generate-integration-code";
import type { DemoData } from "@demokit-ai/core";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Copy, RefreshCw, Check, Eye, EyeOff, ChevronDown } from "lucide-react";
import { useHostedApi } from "@/hooks/use-hosted-api";
import type { FixtureWithRelations } from "@/hooks/use-fixtures";

export interface IntegrationGuideProps {
  /** Integration mode: local (bundled) or remote (API) */
  mode: IntegrationMode;
  /** The generated fixture data (for local mode) */
  data?: DemoData;
  /** Project name for naming conventions */
  projectName?: string;
  /** Project ID (for remote mode) */
  projectId?: string;
  /** Available fixtures (for remote mode) */
  fixtures?: FixtureWithRelations[];
}

const FRAMEWORKS: { value: Framework; label: string; description: string }[] = [
  {
    value: "javascript",
    label: "JavaScript",
    description: "Vanilla JS with fetch",
  },
  {
    value: "react",
    label: "React",
    description: "Vite, CRA, or custom setup",
  },
  {
    value: "nextjs",
    label: "Next.js",
    description: "App Router or Pages Router",
  },
  {
    value: "remix",
    label: "Remix",
    description: "Server-side loaders/actions",
  },
  {
    value: "tanstack-query",
    label: "TanStack Query",
    description: "React Query v5",
  },
  {
    value: "swr",
    label: "SWR",
    description: "Vercel SWR",
  },
  {
    value: "trpc",
    label: "tRPC",
    description: "Type-safe tRPC v11",
  },
];

export function IntegrationGuide({
  mode,
  data,
  projectName = "Demo",
  fixtures = [],
}: IntegrationGuideProps) {
  const [selectedFramework, setSelectedFramework] =
    useState<Framework>("nextjs");

  // For remote mode: use the fixture passed from parent
  const selectedFixtureId = fixtures[0]?.id;

  const {
    apiKey,
    hostedEnabled,
    isLoading: isApiLoading,
    isEnabling,
    isRegeneratingKey,
    toggleHosted,
    regenerateApiKey,
  } = useHostedApi(mode === "remote" ? selectedFixtureId : undefined);

  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState<"endpoint" | "apiKey" | null>(null);

  // Track which steps are open (all open by default)
  const [openSteps, setOpenSteps] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true, // How it works
  });

  const toggleStep = useCallback((step: number) => {
    setOpenSteps((prev) => ({ ...prev, [step]: !prev[step] }));
  }, []);

  // Copy to clipboard handler
  const handleCopy = useCallback(
    async (text: string, type: "endpoint" | "apiKey") => {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    },
    []
  );

  const apiEndpoint = "https://api.demokit.ai/v1/fixtures";

  // Mask API key for display
  const maskedApiKey = apiKey
    ? showApiKey
      ? apiKey
      : `${apiKey.slice(0, 12)}••••••••••••`
    : "Not generated";

  const code = useMemo(
    () =>
      generateIntegrationCode({
        framework: selectedFramework,
        mode,
        data: mode === "local" ? data : undefined,
        projectName,
        includeTypes: true,
        apiEndpoint,
      }),
    [selectedFramework, mode, data, projectName]
  );

  return (
    <div className="flex gap-6">
      {/* Framework Selector - Left Side (Sticky) */}
      <div className="w-48 flex-shrink-0">
        <div className="sticky top-16">
          <h3 className="text-sm font-medium text-foreground mb-3">
            Select your framework
          </h3>
          <div className="flex flex-col gap-1">
            {FRAMEWORKS.map((framework) => (
              <button
                key={framework.value}
                type="button"
                onClick={() => setSelectedFramework(framework.value)}
                className={`
                px-3 py-2.5 text-left transition-all rounded-lg border
                ${
                  selectedFramework === framework.value
                    ? "bg-primary/10 border-primary text-primary shadow-sm"
                    : "bg-transparent border-transparent text-foreground hover:bg-muted hover:border-border"
                }
              `}
              >
                <div className="font-medium text-sm">{framework.label}</div>
                <div
                  className={`text-xs ${
                    selectedFramework === framework.value
                      ? "text-primary/70"
                      : "text-muted-foreground"
                  }`}
                >
                  {framework.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Steps - Right Side */}
      <div className="flex-1 space-y-6">
        {/* How It Works */}
        <Collapsible open={openSteps[5]} onOpenChange={() => toggleStep(5)}>
          <Card className="border-primary/30 bg-primary/5">
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-primary/10 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">How it works</CardTitle>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      openSteps[5] ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="text-sm text-muted-foreground space-y-2">
            {mode === "remote" && (
              <>
                <p>
                  DemoKit fetches your fixture data from the cloud API at
                  runtime. This means you can update fixtures without
                  redeploying your app.
                </p>
                <p>
                  The data is cached client-side for performance. Changes to
                  fixtures in DemoKit Cloud are reflected on next page load.
                </p>
              </>
            )}
            {mode === "local" && selectedFramework === "remix" && (
              <>
                <p>
                  DemoKit wraps your Remix loaders and actions with{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    createDemoLoader
                  </code>{" "}
                  and{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    createDemoAction
                  </code>
                  . When demo mode is enabled (via URL param, cookie, or
                  header), your fixtures are returned instead of running the
                  real loader.
                </p>
                <p>
                  Demo mode is detected server-side, so your loaders never hit
                  the database in demo mode. Enable via{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    ?demo=true
                  </code>{" "}
                  or set a cookie.
                </p>
              </>
            )}
            {mode === "local" && selectedFramework === "tanstack-query" && (
              <>
                <p>
                  DemoKit intercepts TanStack Query calls based on{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    queryKey
                  </code>{" "}
                  patterns. When demo mode is enabled, matching queries return
                  fixture data instead of calling your queryFn.
                </p>
                <p>
                  Your existing{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    useQuery
                  </code>{" "}
                  calls work unchanged. Fixtures match on query keys like{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    [&quot;users&quot;]
                  </code>{" "}
                  or{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    [&quot;users&quot;, id]
                  </code>
                  .
                </p>
              </>
            )}
            {mode === "local" && selectedFramework === "swr" && (
              <>
                <p>
                  DemoKit uses SWR middleware to intercept fetches based on key
                  patterns. When demo mode is enabled, matching keys return
                  fixture data instead of calling your fetcher.
                </p>
                <p>
                  Your existing{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    useSWR
                  </code>{" "}
                  calls work unchanged. Fixtures match on URL patterns like{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    /api/users
                  </code>{" "}
                  or{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    /api/users/:id
                  </code>
                  .
                </p>
              </>
            )}
            {mode === "local" && selectedFramework === "trpc" && (
              <>
                <p>
                  DemoKit uses a tRPC link to intercept procedure calls. When
                  demo mode is enabled, matching procedures return fixture data
                  instead of hitting your server.
                </p>
                <p>
                  Fixtures are fully type-safe — TypeScript infers input/output
                  types from your router. Toggle demo mode via localStorage and
                  reload to apply.
                </p>
              </>
            )}
            {mode === "local" &&
              (selectedFramework === "react" ||
                selectedFramework === "nextjs") && (
                <>
                  <p>
                    DemoKit intercepts{" "}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      fetch()
                    </code>{" "}
                    calls when demo mode is enabled and returns your fixture
                    data instead of hitting your real API.
                  </p>
                  <p>
                    Your existing data fetching code (React Query, SWR, tRPC,
                    etc.) works unchanged. Just wrap your app with the provider
                    and toggle demo mode when needed.
                  </p>
                </>
              )}
            {mode === "local" && selectedFramework === "javascript" && (
              <>
                <p>
                  Use a simple{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    demoFetch
                  </code>{" "}
                  wrapper around the native fetch API. When demo mode is enabled
                  (via localStorage), it returns fixture data instead of hitting
                  your real API.
                </p>
                <p>
                  No frameworks or build tools required — works in any JavaScript
                  environment including vanilla JS, Node.js, and Deno.
                </p>
              </>
            )}
            {mode === "remote" && selectedFramework === "javascript" && (
              <>
                <p>
                  Fetch your fixture data directly from the DemoKit Cloud API
                  using the native{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    fetch()
                  </code>{" "}
                  function. No framework dependencies required.
                </p>
                <p>
                  Perfect for vanilla JavaScript apps, server-side scripts, or
                  any environment where you want to keep dependencies minimal.
                </p>
              </>
            )}
            <p className="font-medium text-foreground">
              Perfect for demos, testing, and development without a backend.
            </p>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
        {/* Step 1: Install */}
        <Collapsible open={openSteps[1]} onOpenChange={() => toggleStep(1)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      1
                    </Badge>
                    <CardTitle className="text-base">
                      Install packages
                    </CardTitle>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      openSteps[1] ? "rotate-180" : ""
                    }`}
                  />
                </div>
                <CardDescription className="text-sm">
                  Add DemoKit to your project
                </CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <CodeBlock code={code.install} language="bash" />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Step 2: Mode-specific */}
        {mode === "local" ? (
          /* Local Mode: Create Fixtures */
          <Collapsible open={openSteps[2]} onOpenChange={() => toggleStep(2)}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="h-5 w-5 flex items-center justify-center p-0 text-xs"
                      >
                        2
                      </Badge>
                      <CardTitle className="text-base">
                        Create fixtures file
                      </CardTitle>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${
                        openSteps[2] ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                  <CardDescription className="text-sm">
                    Save this as{" "}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {selectedFramework === "nextjs"
                        ? "src/lib/fixtures.ts"
                        : selectedFramework === "remix"
                        ? "app/lib/fixtures.ts"
                        : selectedFramework === "trpc"
                        ? "src/lib/fixtures.ts"
                        : "src/fixtures.ts"}
                    </code>
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <CodeBlock
                    code={code.fixtures}
                    language="typescript"
                    filename={
                      selectedFramework === "nextjs"
                        ? "fixtures.ts"
                        : "fixtures.ts"
                    }
                    showDownload
                    maxHeight="400px"
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ) : (
          /* Remote Mode: Configure API */
          <Collapsible open={openSteps[2]} onOpenChange={() => toggleStep(2)}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="h-5 w-5 flex items-center justify-center p-0 text-xs"
                      >
                        2
                      </Badge>
                      <CardTitle className="text-base">
                        Configure API access
                      </CardTitle>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${
                        openSteps[2] ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                  <CardDescription className="text-sm">
                    Enable the hosted API and get your credentials
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  {/* API Access Toggle */}
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm">API Access</div>
                      <div className="text-xs text-muted-foreground">
                        Enable to serve this fixture via hosted API
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={hostedEnabled ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleHosted(!hostedEnabled)}
                        disabled={
                          isApiLoading || isEnabling || !selectedFixtureId
                        }
                      >
                        {isEnabling
                          ? "Updating..."
                          : hostedEnabled
                          ? "Disable"
                          : "Enable"}
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

                  {hostedEnabled && (
                    <>
                      {/* Endpoint */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                          Endpoint
                        </Label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono">
                            {apiEndpoint}
                          </code>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleCopy(apiEndpoint, "endpoint")}
                          >
                            {copied === "endpoint" ? (
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
                            onClick={() =>
                              apiKey && handleCopy(apiKey, "apiKey")
                            }
                            disabled={!apiKey}
                          >
                            {copied === "apiKey" ? (
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
                            <RefreshCw
                              className={`h-4 w-4 mr-1 ${
                                isRegeneratingKey ? "animate-spin" : ""
                              }`}
                            />
                            Regenerate
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Keep your API key secret. If compromised, regenerate
                          it immediately.
                        </p>
                      </div>

                      {/* Config Code */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                          Configuration
                        </Label>
                        <CodeBlock
                          code={code.fixtures}
                          language="typescript"
                          maxHeight="300px"
                        />
                      </div>
                    </>
                  )}

                  {!hostedEnabled && !selectedFixtureId && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Select a fixture to enable API access
                    </p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Step 3: Setup Provider */}
        <Collapsible open={openSteps[3]} onOpenChange={() => toggleStep(3)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      3
                    </Badge>
                    <CardTitle className="text-base">
                      {selectedFramework === "trpc"
                        ? "Configure tRPC client"
                        : selectedFramework === "javascript"
                        ? "Create fetch wrapper"
                        : "Wrap your app"}
                    </CardTitle>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      openSteps[3] ? "rotate-180" : ""
                    }`}
                  />
                </div>
                <CardDescription className="text-sm">
                  {selectedFramework === "trpc"
                    ? "Add the demo link to your tRPC client"
                    : selectedFramework === "javascript"
                    ? "Create a demo-aware fetch wrapper"
                    : "Add the DemoKit provider to your app's root"}
                </CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <CodeBlock
                  code={code.provider}
                  language={selectedFramework === "javascript" ? "javascript" : "tsx"}
                  maxHeight="350px"
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Step 4: Usage */}
        <Collapsible open={openSteps[4]} onOpenChange={() => toggleStep(4)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      4
                    </Badge>
                    <CardTitle className="text-base">
                      {selectedFramework === "javascript"
                        ? "Use in your code"
                        : "Use in components"}
                    </CardTitle>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      openSteps[4] ? "rotate-180" : ""
                    }`}
                  />
                </div>
                <CardDescription className="text-sm">
                  {selectedFramework === "javascript"
                    ? "Fetch data and toggle demo mode"
                    : "Control demo mode from anywhere in your app"}
                </CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <CodeBlock
                  code={code.usage}
                  language={selectedFramework === "javascript" ? "javascript" : "tsx"}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  );
}
