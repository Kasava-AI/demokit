'use client'

import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Staggered container — wraps children with staggered entrance animation.
 * Each direct child Card/section animates in sequence.
 */
interface StaggerProps {
  children: ReactNode
  className?: string
  /** Delay between each child in seconds */
  staggerDelay?: number
}

export function Stagger({ children, className, staggerDelay = 0.05 }: StaggerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * FadeIn — individual item that fades in + slides up.
 * Use as direct child of <Stagger> or standalone.
 */
interface FadeInProps {
  children: ReactNode
  className?: string
  /** When used standalone (not inside Stagger), set explicit delay */
  delay?: number
}

export function FadeIn({ children, className, delay }: FadeInProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0 },
      }}
      initial={delay !== undefined ? { opacity: 0, y: 8 } : undefined}
      animate={delay !== undefined ? { opacity: 1, y: 0 } : undefined}
      transition={{
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
        ...(delay !== undefined ? { delay } : {}),
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * AnimatedSuccess — brief checkmark/text that fades in and auto-fades out.
 */
interface AnimatedFeedbackProps {
  show: boolean
  children: ReactNode
}

export function AnimatedFeedback({ show, children }: AnimatedFeedbackProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.span>
      )}
    </AnimatePresence>
  )
}

export { motion, AnimatePresence }
