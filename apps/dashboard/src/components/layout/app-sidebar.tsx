'use client'

import Link from 'next/link'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { SidebarNavigation } from './sidebar-navigation'
import { SidebarUserProfile } from './sidebar-user-profile'
import { OrgSwitcher } from './org-switcher'

function SidebarHeaderContent() {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  return (
    <SidebarHeader className="border-b gap-2">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            className="group data-[state=open]:bg-sidebar-accent hover:shadow-none hover:bg-transparent hover:text-primary data-[state=open]:text-sidebar-accent-foreground"
            asChild
          >
            <Link href="/projects">
              {isCollapsed ? (
                <div className="flex items-center justify-center w-full">
                  <div className="size-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl shadow-sm">
                    D
                  </div>
                </div>
              ) : (
                <div className="text-2xl font-bold tracking-tight transition-colors">
                  DemoKit
                </div>
              )}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <OrgSwitcher />
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  )
}

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeaderContent />

      <SidebarContent className="px-2">
        <SidebarNavigation />
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarUserProfile />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
