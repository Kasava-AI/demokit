'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { motion, LayoutGroup } from 'framer-motion'
import {
  FolderOpen,
  Settings,
  User,
  Bot,
  Key,
  Building2,
  CreditCard,
  Plus,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useProjects } from '@/hooks/use-projects'
import { useOrganizationContext } from '@/contexts/organization-context'
import { Skeleton } from '@/components/ui/skeleton'
import { SidebarCollapsibleSection } from './sidebar-collapsible-section'

interface ProjectListItem {
  id: string
  name: string
}

function ProjectNavItem({
  id,
  name,
  isActive,
  layoutId,
}: {
  id: string
  name: string
  isActive: boolean
  layoutId: string
}) {
  const prefersReducedMotion = useReducedMotion()
  return (
    <Link
      href={`/projects/${id}`}
      prefetch
      data-active={isActive}
      className={cn(
        'relative flex w-full items-center gap-2 overflow-hidden rounded-md px-2 py-1 text-[13px] outline-hidden transition-colors',
        'hover:bg-primary/10',
        'focus-visible:ring-2 focus-visible:ring-ring',
        isActive && 'font-medium text-primary-foreground'
      )}
    >
      {isActive && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 rounded-md bg-primary"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 400, damping: 30 }
          }
        />
      )}
      <span className="relative z-10 truncate">{name}</span>
    </Link>
  )
}

interface SettingsLink {
  id: string
  href: string
  label: string
  icon: LucideIcon
}

const SETTINGS_LINKS: SettingsLink[] = [
  { id: 'general', href: '/settings/general', label: 'General', icon: User },
  { id: 'ai-generation', href: '/settings/ai-generation', label: 'Narrative generation', icon: Bot },
  { id: 'api-keys', href: '/settings/api-keys', label: 'API keys', icon: Key },
  { id: 'organization', href: '/settings/organization', label: 'Organization', icon: Building2 },
  { id: 'billing', href: '/settings/billing', label: 'Billing', icon: CreditCard },
]

function SettingsNavItem({
  link,
  isActive,
  layoutId,
}: {
  link: SettingsLink
  isActive: boolean
  layoutId: string
}) {
  const prefersReducedMotion = useReducedMotion()
  const Icon = link.icon
  return (
    <Link
      href={link.href}
      prefetch
      data-active={isActive}
      className={cn(
        'relative flex w-full items-center gap-2 overflow-hidden rounded-md px-2 py-1 text-[13px] outline-hidden transition-colors',
        'hover:bg-primary/10',
        'focus-visible:ring-2 focus-visible:ring-ring',
        isActive && 'font-medium text-primary-foreground'
      )}
    >
      {isActive && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 rounded-md bg-primary"
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
        <Icon className="size-3.5" />
        {link.label}
      </span>
    </Link>
  )
}

function ProjectsLoadingSkeleton() {
  return (
    <div className="px-2 py-1 space-y-2 group-data-[collapsible=icon]:hidden">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="size-3.5 rounded" />
          <Skeleton className="h-3 flex-1" />
        </div>
      ))}
    </div>
  )
}

export function SidebarNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const { currentOrg } = useOrganizationContext()
  const { data: projects, isLoading } = useProjects(currentOrg?.id)

  const projectItems: ProjectListItem[] = (projects ?? []).map((p) => ({ id: p.id, name: p.name }))
  const projectsActive = pathname?.startsWith('/projects') ?? false
  const settingsActive = pathname?.startsWith('/settings') ?? false

  return (
    <div className="space-y-1">
      {isLoading ? (
        <ProjectsLoadingSkeleton />
      ) : (
        <LayoutGroup id="sidebar-projects">
          <SidebarCollapsibleSection<ProjectListItem>
            sectionId="projects"
            icon={FolderOpen}
            label="Projects"
            count={projectItems.length}
            isHeaderActive={projectsActive}
            items={projectItems}
            getItemId={(p) => p.id}
            isActiveItem={(p) =>
              pathname === `/projects/${p.id}` ||
              (pathname?.startsWith(`/projects/${p.id}/`) ?? false)
            }
            renderItem={(p, { isActive }) => (
              <ProjectNavItem
                id={p.id}
                name={p.name}
                isActive={isActive}
                layoutId="sidebar-projects-indicator"
              />
            )}
            zeroStateCTA={{
              label: 'Create your first project',
              onClick: () => router.push('/projects/new'),
            }}
            footerAction={{
              label: 'New project',
              href: '/projects/new',
              icon: Plus,
            }}
          />
        </LayoutGroup>
      )}

      <LayoutGroup id="sidebar-settings">
        <SidebarCollapsibleSection<SettingsLink>
          sectionId="settings"
          icon={Settings}
          label="Settings"
          count={SETTINGS_LINKS.length}
          isHeaderActive={settingsActive}
          items={SETTINGS_LINKS}
          getItemId={(l) => l.id}
          isActiveItem={(l) => pathname === l.href || (pathname?.startsWith(`${l.href}/`) ?? false)}
          renderItem={(l, { isActive }) => (
            <SettingsNavItem
              link={l}
              isActive={isActive}
              layoutId="sidebar-settings-indicator"
            />
          )}
          previewLimit={SETTINGS_LINKS.length}
        />
      </LayoutGroup>
    </div>
  )
}
