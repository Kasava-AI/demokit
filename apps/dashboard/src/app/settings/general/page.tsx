'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Settings, Palette, FileJson } from 'lucide-react'

// Local storage keys
const STORAGE_KEYS = {
  theme: 'demokit-theme',
  exportFormat: 'demokit-export-format',
}

type Theme = 'light' | 'dark' | 'system'
type ExportFormat = 'json' | 'typescript' | 'sql' | 'csv'

export default function GeneralSettingsPage() {
  const [theme, setTheme] = useState<Theme>('system')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json')
  const [isHydrated, setIsHydrated] = useState(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) as Theme | null
    const savedExportFormat = localStorage.getItem(STORAGE_KEYS.exportFormat) as ExportFormat | null

    if (savedTheme) setTheme(savedTheme)
    if (savedExportFormat) setExportFormat(savedExportFormat)

    setIsHydrated(true)
  }, [])

  // Save theme to localStorage and apply
  const handleThemeChange = (value: Theme) => {
    setTheme(value)
    localStorage.setItem(STORAGE_KEYS.theme, value)

    // Apply theme to document
    const root = document.documentElement
    if (value === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.toggle('dark', systemTheme === 'dark')
    } else {
      root.classList.toggle('dark', value === 'dark')
    }
  }

  // Save export format to localStorage
  const handleExportFormatChange = (value: ExportFormat) => {
    setExportFormat(value)
    localStorage.setItem(STORAGE_KEYS.exportFormat, value)
  }

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">General Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your DemoKit preferences
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
        <h1 className="text-2xl font-bold">General Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your DemoKit preferences
        </p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Palette className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how DemoKit looks</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select value={theme} onValueChange={handleThemeChange}>
              <SelectTrigger id="theme">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose your preferred color scheme
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Export Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <FileJson className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <CardTitle>Export</CardTitle>
              <CardDescription>Default export settings for fixtures</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exportFormat">Default Export Format</Label>
            <Select value={exportFormat} onValueChange={handleExportFormatChange}>
              <SelectTrigger id="exportFormat">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="typescript">TypeScript</SelectItem>
                <SelectItem value="sql">SQL</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Default format when exporting generated fixtures
            </p>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Settings className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <CardTitle>About</CardTitle>
              <CardDescription>DemoKit OSS information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Version</span>
              <span className="text-sm font-medium">1.0.0</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">License</span>
              <span className="text-sm font-medium">Apache 2.0</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Documentation</span>
              <a
                href="https://demokit.ai/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline"
              >
                demokit.ai/docs
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
