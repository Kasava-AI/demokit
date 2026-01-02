import { createContext } from 'react'
import type { DemoModeContextValue } from './types'

/**
 * React context for demo mode state
 * @internal
 */
export const DemoModeContext = createContext<DemoModeContextValue | undefined>(undefined)

DemoModeContext.displayName = 'DemoModeContext'
