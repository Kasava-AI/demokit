'use client'

import { useRouter } from 'next/navigation'
import { Settings, ChevronUp, Moon, Sun, LogOut } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/contexts/auth-context'
import {
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.split(/[\s._-]/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

export function SidebarUserProfile() {
  const { user, authEnabled, signOut } = useAuth()
  const router = useRouter()
  const { state } = useSidebar()
  const { theme, setTheme } = useTheme()
  const isCollapsed = state === 'collapsed'
  const isDark = theme === 'dark'

  const displayName = user?.user_metadata?.name || (authEnabled ? 'User' : 'Local User')
  const email = user?.email
  const initials = getInitials(displayName)
  const modeLabel = authEnabled ? 'Cloud' : 'OSS Mode'

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            {initials}
          </div>
          {!isCollapsed && (
            <>
              <div className="flex flex-1 flex-col gap-0.5 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {modeLabel}
                </span>
              </div>
              <ChevronUp className="ml-auto size-4" />
            </>
          )}
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56"
        side="top"
        align="start"
        sideOffset={4}
      >
        <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            {initials}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{displayName}</span>
            <span className="text-xs text-muted-foreground">
              {email || modeLabel}
            </span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/settings')}>
          <Settings className="mr-2 size-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme(isDark ? 'light' : 'dark')}>
          {isDark ? (
            <Sun className="mr-2 size-4" />
          ) : (
            <Moon className="mr-2 size-4" />
          )}
          {isDark ? 'Light mode' : 'Dark mode'}
        </DropdownMenuItem>
        {authEnabled && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
