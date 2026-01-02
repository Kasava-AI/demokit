'use client'

import { createContext } from 'react'
import type { DemoSWRState } from './types'

/**
 * Context for DemoSWR state
 * @internal
 */
export const DemoSWRContext = createContext<DemoSWRState | undefined>(undefined)

DemoSWRContext.displayName = 'DemoSWRContext'
