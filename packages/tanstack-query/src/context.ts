'use client'

import { createContext } from 'react'
import type { DemoQueryState } from './types'

/**
 * Context for DemoQuery state
 * @internal
 */
export const DemoQueryContext = createContext<DemoQueryState | undefined>(undefined)

DemoQueryContext.displayName = 'DemoQueryContext'
