'use client'

/**
 * ApiCallLogs Component
 *
 * Displays real-time API call logs for a fixture using SSE streaming.
 * Features:
 * - Auto-scroll with pause on user interaction
 * - Timestamp, status code, response time, IP, user agent
 * - Empty state for no logs
 * - Connection status indicator
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Pause, Play, Trash2, Wifi, WifiOff } from 'lucide-react'
import { useApiCallLogs } from '@/hooks/use-api-call-logs'
import { cn } from '@/lib/utils'

interface ApiCallLogsProps {
  fixtureId: string
  projectId: string
}

export function ApiCallLogs({ fixtureId, projectId }: ApiCallLogsProps) {
  const {
    logs,
    isConnected,
    isPaused,
    togglePause,
    clearLogs,
  } = useApiCallLogs({ fixtureId, projectId })

  // Format timestamp for display
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  // Format user agent for display (truncate)
  const formatUserAgent = (userAgent: string | null) => {
    if (!userAgent) return 'Unknown'
    // Extract browser/client name
    if (userAgent.includes('curl')) return 'curl'
    if (userAgent.includes('Chrome')) {
      const match = userAgent.match(/Chrome\/(\d+)/)
      return match ? `Chrome/${match[1]}` : 'Chrome'
    }
    if (userAgent.includes('Firefox')) {
      const match = userAgent.match(/Firefox\/(\d+)/)
      return match ? `Firefox/${match[1]}` : 'Firefox'
    }
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    // Truncate long user agents
    return userAgent.length > 20 ? `${userAgent.slice(0, 20)}...` : userAgent
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">API Call Logs</CardTitle>
            {isConnected ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Wifi className="h-3 w-3 mr-1" />
                Live
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                <WifiOff className="h-3 w-3 mr-1" />
                Disconnected
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={togglePause}
            >
              {isPaused ? (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearLogs}
              disabled={logs.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p>No API calls yet.</p>
            <p className="text-sm mt-1">
              Make a request to see logs here.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-1 font-mono text-sm">
              {/* Header row */}
              <div className="flex items-center gap-4 px-2 py-1 text-xs text-muted-foreground border-b">
                <span className="w-20">Time</span>
                <span className="w-12">Status</span>
                <span className="w-16">Duration</span>
                <span className="w-32">IP</span>
                <span className="flex-1">Client</span>
              </div>

              {/* Log entries */}
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    'flex items-center gap-4 px-2 py-1.5 rounded hover:bg-muted/50 transition-colors',
                    log.statusCode >= 400 && 'bg-red-50 dark:bg-red-950/20'
                  )}
                >
                  <span className="w-20 text-muted-foreground">
                    {formatTime(log.timestamp)}
                  </span>
                  <span className="w-12">
                    <Badge
                      variant={
                        log.statusCode >= 200 && log.statusCode < 300
                          ? 'default'
                          : log.statusCode >= 400
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="text-xs px-1.5 py-0"
                    >
                      {log.statusCode}
                    </Badge>
                  </span>
                  <span className="w-16 text-muted-foreground">
                    {log.responseTimeMs}ms
                  </span>
                  <span className="w-32 text-muted-foreground truncate">
                    {log.ipAddress || 'Unknown'}
                  </span>
                  <span className="flex-1 text-muted-foreground truncate">
                    {formatUserAgent(log.userAgent)}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
