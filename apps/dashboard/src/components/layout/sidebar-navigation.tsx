'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FolderOpen } from 'lucide-react'
import { motion, LayoutGroup } from 'framer-motion'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useProjects } from '@/hooks/use-projects'
import { useOrganizationContext } from '@/contexts/organization-context'
import { Skeleton } from '@/components/ui/skeleton'

interface ProjectNavItemProps {
  id: string
  name: string
  isActive: boolean
  layoutId: string
}

function ProjectNavItem({ id, name, isActive, layoutId }: ProjectNavItemProps) {
  const prefersReducedMotion = useReducedMotion()
  const { state, isMobile } = useSidebar()
  const isCollapsed = state === 'collapsed'

  const linkContent = (
    <Link
      href={`/projects/${id}`}
      prefetch={true}
      data-active={isActive}
      className={cn(
        'peer/menu-button relative flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-colors',
        'hover:bg-primary hover:text-primary-foreground hover:shadow-md',
        'focus-visible:ring-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! group-data-[collapsible=icon]:justify-center',
        '[&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
        isActive && 'font-semibold text-primary-foreground'
      )}
    >
      {isActive && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 rounded-md bg-primary shadow-md"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 400, damping: 30 }
          }
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        <FolderOpen className="size-4 shrink-0" />
        <span className="group-data-[collapsible=icon]:hidden">{name}</span>
      </span>
    </Link>
  )

  // Show tooltip when collapsed
  if (isCollapsed && !isMobile) {
    return (
      <SidebarMenuItem>
        <Tooltip>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" align="center">
            {name}
          </TooltipContent>
        </Tooltip>
      </SidebarMenuItem>
    )
  }

  return <SidebarMenuItem>{linkContent}</SidebarMenuItem>
}

function ProjectsLoadingSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <SidebarMenuItem key={i}>
          <div className="flex items-center gap-2 p-2">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 flex-1" />
          </div>
        </SidebarMenuItem>
      ))}
    </>
  )
}

export function SidebarNavigation() {
  const pathname = usePathname()
  const { currentOrg } = useOrganizationContext()
  const { data: projects, isLoading } = useProjects(currentOrg?.id)

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarGroupContent>
        <LayoutGroup id="sidebar-nav-projects">
          <SidebarMenu>
            {isLoading ? (
              <ProjectsLoadingSkeleton />
            ) : projects && projects.length > 0 ? (
              projects.map((project) => {
                const isActive = pathname === `/projects/${project.id}` ||
                  pathname.startsWith(`/projects/${project.id}/`)
                return (
                  <ProjectNavItem
                    key={project.id}
                    id={project.id}
                    name={project.name}
                    isActive={isActive}
                    layoutId="sidebar-projects-indicator"
                  />
                )
              })
            ) : (
              <SidebarMenuItem>
                <span className="p-2 text-sm text-muted-foreground">
                  No projects yet
                </span>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </LayoutGroup>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
