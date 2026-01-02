'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, Key, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    href: '/settings/general',
    label: 'General',
    icon: Settings,
  },
  {
    href: '/settings/api-keys',
    label: 'API Keys',
    icon: Key,
  },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/30 p-6">
        <div className="mb-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <h2 className="text-lg font-semibold mb-4">Settings</h2>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-8 pt-6 border-t">
          <p className="text-xs text-muted-foreground">
            DemoKit OSS v1.0.0
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        <div className="max-w-2xl">
          {children}
        </div>
      </main>
    </div>
  )
}
