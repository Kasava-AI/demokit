'use client'

import { ChevronRight as ChevronRightIcon } from 'lucide-react'
import { motion } from 'framer-motion'

/**
 * Chevron icon that animates rotation. Use for collapsible/expandable UI.
 *
 * @example
 * <Chevron animate={{ rotate: isOpen ? 90 : 0 }} className="h-4 w-4" />
 */
export const Chevron = motion.create(ChevronRightIcon)
