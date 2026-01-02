'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cva, type VariantProps } from 'class-variance-authority'
import { motion, LayoutGroup } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'

import { cn } from '@/lib/utils'

const Tabs = TabsPrimitive.Root

/**
 * Tab style variants:
 * - default: Classic pill style with muted background container
 * - underline: Clean underline indicator (GitHub, Linear style)
 * - pill: Minimal pill without container background
 * - ghost: Text-only with no background, just color changes
 * - segment: iOS-style segmented control
 */
const tabsListVariants = cva(
  'inline-flex items-center text-muted-foreground',
  {
    variants: {
      variant: {
        default: 'h-10 justify-center rounded-md bg-muted p-1',
        underline: 'h-10 justify-start gap-4 border-b border-border bg-transparent p-0',
        pill: 'h-10 justify-center gap-1 bg-transparent p-0',
        ghost: 'h-10 justify-start gap-6 bg-transparent p-0',
        segment: 'h-10 justify-center rounded-lg bg-muted p-1 gap-0',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const tabsTriggerVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'rounded-lg px-3 py-1.5 hover:text-foreground hover:bg-background/50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        underline:
          'relative px-1 pb-3 pt-2 hover:text-foreground data-[state=active]:text-foreground data-[state=active]:font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent data-[state=active]:after:bg-primary',
        pill:
          'rounded-full px-4 py-2 hover:text-foreground hover:bg-muted data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm',
        ghost:
          'px-1 py-2 hover:text-foreground data-[state=active]:text-foreground data-[state=active]:font-semibold',
        segment:
          'flex-1 rounded-md px-3 py-1.5 hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>,
    VariantProps<typeof tabsListVariants> {}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(tabsListVariants({ variant }), className)}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof tabsTriggerVariants> {}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(function TabsTriggerComponent({ className, variant, ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(tabsTriggerVariants({ variant }), className)}
      {...(props as React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>)}
    />
  )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

// Animated Tab Components with sliding indicator

/**
 * Animated tab variants with smooth sliding indicators
 * - default: Sliding pill background
 * - underline: Sliding underline indicator
 * - pill: Sliding pill with primary color
 * - ghost: Sliding text highlight (no background)
 * - segment: Sliding segment background
 */
const animatedTabsListVariants = cva(
  'inline-flex items-center text-muted-foreground',
  {
    variants: {
      variant: {
        default: 'h-10 justify-center rounded-md bg-muted p-1',
        underline: 'h-10 justify-start gap-4 border-b border-border bg-transparent p-0',
        pill: 'h-10 justify-center gap-1 bg-transparent p-0',
        ghost: 'h-10 justify-start gap-6 bg-transparent p-0',
        segment: 'h-10 justify-center rounded-lg bg-muted p-1 gap-0',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

interface AnimatedTabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>,
    VariantProps<typeof animatedTabsListVariants> {
  layoutId?: string
}

const AnimatedTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  AnimatedTabsListProps
>(({ className, variant, layoutId = 'tabs', children, ...props }, ref) => (
  <LayoutGroup id={layoutId}>
    <TabsPrimitive.List
      ref={ref}
      className={cn(animatedTabsListVariants({ variant }), className)}
      {...props}
    >
      {children}
    </TabsPrimitive.List>
  </LayoutGroup>
))
AnimatedTabsList.displayName = 'AnimatedTabsList'

const animatedTabsTriggerVariants = cva(
  'relative inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'rounded-lg px-3 py-1.5 hover:text-foreground data-[state=active]:text-foreground',
        underline: 'px-1 pb-3 pt-2 hover:text-foreground data-[state=active]:text-foreground data-[state=active]:font-semibold',
        pill: 'rounded-full px-4 py-2 hover:text-foreground data-[state=active]:text-primary-foreground',
        ghost: 'px-1 py-2 hover:text-foreground data-[state=active]:text-primary data-[state=active]:font-semibold',
        segment: 'flex-1 rounded-md px-3 py-1.5 hover:text-foreground data-[state=active]:text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

// Indicator styles for each variant
const indicatorVariants = {
  default: 'absolute inset-0 rounded-lg bg-background shadow-sm',
  underline: 'absolute bottom-0 left-0 right-0 h-0.5 bg-primary',
  pill: 'absolute inset-0 rounded-full bg-primary shadow-sm',
  ghost: 'absolute bottom-0 left-0 right-0 h-0.5 bg-primary',
  segment: 'absolute inset-0 rounded-md bg-background shadow-sm',
}

interface AnimatedTabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof animatedTabsTriggerVariants> {
  isActive?: boolean
  layoutId?: string
}

const AnimatedTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  AnimatedTabsTriggerProps
>(
  (
    {
      className,
      variant = 'default',
      isActive,
      layoutId = 'tab-indicator',
      children,
      ...props
    },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion()
    const resolvedVariant = (variant || 'default') as keyof typeof indicatorVariants

    return (
      <TabsPrimitive.Trigger
        ref={ref}
        className={cn(
          animatedTabsTriggerVariants({ variant }),
          !isActive && resolvedVariant === 'default' && 'hover:bg-background/50',
          !isActive && resolvedVariant === 'pill' && 'hover:bg-muted',
          className
        )}
        {...(props as React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>)}
      >
        <span className="relative z-10">{children}</span>
        {isActive && (
          <motion.span
            layoutId={layoutId}
            className={indicatorVariants[resolvedVariant]}
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : {
                    type: 'spring',
                    stiffness: 500,
                    damping: 40,
                    mass: 1,
                  }
            }
          />
        )}
      </TabsPrimitive.Trigger>
    )
  }
)
AnimatedTabsTrigger.displayName = 'AnimatedTabsTrigger'

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  AnimatedTabsList,
  AnimatedTabsTrigger,
  tabsListVariants,
  tabsTriggerVariants,
  animatedTabsListVariants,
  animatedTabsTriggerVariants,
}

export type { TabsListProps, TabsTriggerProps, AnimatedTabsListProps, AnimatedTabsTriggerProps }
