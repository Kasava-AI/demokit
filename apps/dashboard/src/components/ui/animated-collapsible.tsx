'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AnimatedCollapsibleProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
}

interface AnimatedCollapsibleTriggerProps {
  children: React.ReactNode
  className?: string
  asChild?: boolean
  disabled?: boolean
}

interface AnimatedCollapsibleContentProps {
  children: React.ReactNode
  className?: string
  /** Animation duration in seconds. Default: 0.2 */
  duration?: number
}

const AnimatedCollapsibleContext = React.createContext<{
  open: boolean
  onOpenChange?: (open: boolean) => void
}>({ open: false })

function AnimatedCollapsible({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
  className,
}: AnimatedCollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)

  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(newOpen)
      }
      onOpenChange?.(newOpen)
    },
    [isControlled, onOpenChange]
  )

  return (
    <AnimatedCollapsibleContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      <div className={className} data-state={open ? 'open' : 'closed'}>
        {children}
      </div>
    </AnimatedCollapsibleContext.Provider>
  )
}

function AnimatedCollapsibleTrigger({
  children,
  className,
  asChild,
  disabled,
}: AnimatedCollapsibleTriggerProps) {
  const { open, onOpenChange } = React.useContext(AnimatedCollapsibleContext)

  const handleClick = () => {
    if (!disabled) {
      onOpenChange?.(!open)
    }
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: handleClick,
    })
  }

  return (
    <button type="button" onClick={handleClick} className={className} disabled={disabled}>
      {children}
    </button>
  )
}

function AnimatedCollapsibleContent({
  children,
  className,
  duration = 0.2,
}: AnimatedCollapsibleContentProps) {
  const { open } = React.useContext(AnimatedCollapsibleContext)

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration, ease: 'easeInOut' }}
          className={cn('overflow-hidden', className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export {
  AnimatedCollapsible,
  AnimatedCollapsibleTrigger,
  AnimatedCollapsibleContent,
}
