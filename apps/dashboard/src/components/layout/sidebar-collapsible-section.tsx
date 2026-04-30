'use client'

import {
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Chevron } from '@/components/ui/chevron'
import {
  AnimatedCollapsible,
  AnimatedCollapsibleContent,
} from '@/components/ui/animated-collapsible'
import { cn } from '@/lib/utils'

type IconType = ComponentType<SVGProps<SVGSVGElement>>

const STORAGE_KEY = 'demokit-sidebar-sections'
const DEFAULT_PREVIEW_LIMIT = 5

function readExpanded(sectionId: string): boolean {
  if (typeof window === 'undefined') return false
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return false
  try {
    const parsed = JSON.parse(raw) as Record<string, boolean>
    return parsed[sectionId] === true
  } catch {
    return false
  }
}

function writeExpanded(sectionId: string, expanded: boolean) {
  if (typeof window === 'undefined') return
  let current: Record<string, boolean> = {}
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      current = JSON.parse(raw) as Record<string, boolean>
    } catch {
      // start fresh
    }
  }
  current[sectionId] = expanded
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
}

export interface SidebarCollapsibleSectionProps<TItem> {
  /** Stable id for persisted expand state. */
  sectionId: string
  icon: IconType
  label: string
  /** Numeric count rendered next to the label, e.g. "Projects (12)". */
  count?: number
  /** Active state on the header — drives the "current section" highlight. */
  isHeaderActive?: boolean
  items: TItem[]
  getItemId: (item: TItem) => string
  /** Drives auto-expand and auto-show-all when something inside is active. */
  isActiveItem?: (item: TItem) => boolean
  renderItem: (item: TItem, ctx: { isActive: boolean }) => ReactNode
  /** Items rendered before slicing for preview. */
  previewLimit?: number
  /** Markup shown inside the expanded body when items.length === 0. */
  emptyState?: ReactNode
  /**
   * When `count === 0` and provided, the entire header is replaced with a
   * single click-to-create affordance.
   */
  zeroStateCTA?: { label?: string; onClick: () => void }
  /** Footer action inside the expanded body. */
  footerAction?:
    | { label: string; onClick: () => void; href?: never; icon?: IconType }
    | { label: string; href: string; onClick?: never; icon?: IconType }
}

/**
 * Shared scaffold for sidebar sections. Owns persisted expand state, auto-expand
 * on active route, and the visual chrome of the header + collapsible body.
 *
 * Adapted from Kasava (`SidebarCollapsibleSection`). DemoKit version trims out
 * per-product storage keys, header href links, and renderList overrides.
 */
export function SidebarCollapsibleSection<TItem>({
  sectionId,
  icon: Icon,
  label,
  count,
  isHeaderActive = false,
  items,
  getItemId,
  isActiveItem,
  renderItem,
  previewLimit = DEFAULT_PREVIEW_LIMIT,
  emptyState,
  zeroStateCTA,
  footerAction,
}: SidebarCollapsibleSectionProps<TItem>) {
  const [isExpanded, setIsExpanded] = useState(() => readExpanded(sectionId))
  const [showAll, setShowAll] = useState(false)

  // Auto-expand when a child is active.
  useEffect(() => {
    if (!isActiveItem) return
    const hasActive = items.some(isActiveItem)
    if (hasActive && !isExpanded) {
      setIsExpanded(true)
    }
  }, [items, isActiveItem, isExpanded])

  // Auto-show-all if active item is past preview cutoff.
  useEffect(() => {
    if (!isActiveItem || showAll) return
    const idx = items.findIndex(isActiveItem)
    if (idx >= previewLimit) setShowAll(true)
  }, [items, isActiveItem, showAll, previewLimit])

  // Persist expand state.
  useEffect(() => {
    writeExpanded(sectionId, isExpanded)
  }, [sectionId, isExpanded])

  const resolvedCount = count ?? items.length

  // Zero-state CTA mode — replace the whole header.
  if (resolvedCount === 0 && zeroStateCTA) {
    return (
      <button
        onClick={zeroStateCTA.onClick}
        className={cn(
          'group/item w-full flex items-center gap-2 pl-4 py-1 text-[13px] rounded-md transition-colors cursor-pointer',
          'hover:bg-primary/10 text-foreground hover:text-foreground',
          'group-data-[collapsible=icon]:hidden'
        )}
      >
        <Icon
          className={cn(
            'h-3.5 w-3.5 shrink-0 transition-opacity',
            'opacity-80 group-hover/item:opacity-100'
          )}
        />
        <span className="truncate">{zeroStateCTA.label ?? label}</span>
        <Plus className="ml-auto mr-2 size-3 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity" />
      </button>
    )
  }

  const visibleItems = items.slice(0, showAll ? undefined : previewLimit)
  const FooterIcon = footerAction?.icon ?? Plus

  return (
    <AnimatedCollapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'group/item w-full flex items-center gap-2 pl-4 pr-1 py-1 text-[13px] rounded-md transition-colors cursor-pointer',
          isHeaderActive
            ? 'bg-primary/10 text-foreground'
            : 'hover:bg-primary/10 text-foreground hover:text-foreground'
        )}
      >
        <Icon
          className={cn(
            'h-3.5 w-3.5 shrink-0 transition-opacity',
            'opacity-80 group-hover/item:opacity-100'
          )}
        />
        <span className="truncate group-data-[collapsible=icon]:hidden">
          {label}
          {resolvedCount > 0 && (
            <span className="text-muted-foreground font-normal ml-1">({resolvedCount})</span>
          )}
        </span>
        <span className="ml-auto p-1 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden">
          <Chevron
            className="size-3"
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          />
        </span>
      </button>
      <AnimatedCollapsibleContent>
        <div className="pl-6 mt-1 space-y-1 group-data-[collapsible=icon]:hidden">
          {items.length === 0 ? (
            emptyState ?? (
              <div className="px-2 py-1 text-[12px] text-muted-foreground italic">
                No items yet
              </div>
            )
          ) : (
            visibleItems.map((item) => {
              const isActive = isActiveItem ? isActiveItem(item) : false
              return (
                <div key={getItemId(item)}>{renderItem(item, { isActive })}</div>
              )
            })
          )}
          {!showAll && resolvedCount > previewLimit && (
            <button
              onClick={() => setShowAll(true)}
              className="px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-full text-left"
            >
              View all ({resolvedCount})
            </button>
          )}
          {footerAction &&
            (footerAction.href ? (
              <Link
                href={footerAction.href}
                className="flex items-center gap-2 px-2 py-1 text-[12px] text-muted-foreground hover:text-foreground hover:bg-primary/10 rounded-md transition-colors cursor-pointer w-full"
              >
                <FooterIcon className="h-3 w-3 flex-shrink-0" />
                <span>{footerAction.label}</span>
              </Link>
            ) : (
              <button
                onClick={footerAction.onClick}
                className="flex items-center gap-2 px-2 py-1 text-[12px] text-muted-foreground hover:text-foreground hover:bg-primary/10 rounded-md transition-colors cursor-pointer w-full text-left"
              >
                <FooterIcon className="h-3 w-3 flex-shrink-0" />
                <span>{footerAction.label}</span>
              </button>
            ))}
        </div>
      </AnimatedCollapsibleContent>
    </AnimatedCollapsible>
  )
}
