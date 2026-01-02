'use client'

import { useState } from 'react'
import { Building2, ChevronsUpDown, Plus } from 'lucide-react'
import { useOrganizationContext } from '@/contexts/organization-context'
import {
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CreateOrgDialog } from '@/components/organization/create-org-dialog'
import type { OrgMemberRole } from '@/lib/api-client/members'

/**
 * Role badge styling based on the user's role in the organization
 */
function RoleBadge({ role }: { role: OrgMemberRole }) {
  const variants: Record<OrgMemberRole, 'default' | 'secondary' | 'outline'> = {
    owner: 'default',
    admin: 'secondary',
    member: 'outline',
    viewer: 'outline',
  }

  return (
    <Badge variant={variants[role]} className="ml-auto text-[10px] px-1.5 py-0">
      {role}
    </Badge>
  )
}

export function OrgSwitcher() {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const {
    currentOrg,
    organizations,
    isLoading,
    switchOrg,
  } = useOrganizationContext()

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        {!isCollapsed && (
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2 w-16" />
          </div>
        )}
      </div>
    )
  }

  // No organizations yet
  if (!currentOrg) {
    return (
      <>
        <SidebarMenuButton
          size="lg"
          onClick={() => setCreateDialogOpen(true)}
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-dashed border-muted-foreground/50 text-muted-foreground">
            <Plus className="size-4" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-1 flex-col gap-0.5 text-left text-sm leading-tight">
              <span className="font-medium text-muted-foreground">
                Create Organization
              </span>
            </div>
          )}
        </SidebarMenuButton>
        <CreateOrgDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Building2 className="size-4" />
            </div>
            {!isCollapsed && (
              <>
                <div className="flex flex-1 flex-col gap-0.5 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{currentOrg.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {currentOrg.role}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
              </>
            )}
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-64"
          side="right"
          align="start"
          sideOffset={4}
        >
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Organizations
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={currentOrg.id}
            onValueChange={switchOrg}
          >
            {organizations.map((org) => (
              <DropdownMenuRadioItem
                key={org.id}
                value={org.id}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
                  <Building2 className="size-3" />
                </div>
                <span className="flex-1 truncate">{org.name}</span>
                <RoleBadge role={org.role} />
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setCreateDialogOpen(true)}
            className="cursor-pointer"
          >
            <Plus className="mr-2 size-4" />
            Create Organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateOrgDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </>
  )
}
