import { createContext } from 'react'
import type { DemoTRPCState, FlatFixtureMap } from './types'

/**
 * Default context value when no provider is present
 */
const defaultContextValue: DemoTRPCState = {
  isDemoMode: false,
  setFixture: () => {
    console.warn('[DemoKit/tRPC] setFixture called outside of DemoTRPCProvider')
  },
  removeFixture: () => {
    console.warn('[DemoKit/tRPC] removeFixture called outside of DemoTRPCProvider')
  },
  getFixtures: () => new Map(),
}

/**
 * React context for DemoKit tRPC integration
 */
export const DemoTRPCContext = createContext<DemoTRPCState>(defaultContextValue)
