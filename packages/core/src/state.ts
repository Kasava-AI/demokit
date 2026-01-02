import type { FixtureMap } from './types'

/**
 * Shared demo state interface that can be used across frameworks
 * This provides a consistent API for managing demo mode state
 */
export interface DemoState {
  /**
   * Whether demo mode is currently enabled
   */
  enabled: boolean

  /**
   * The currently active scenario name, if any
   * Scenarios allow grouping fixtures for different demo flows
   */
  scenario: string | null

  /**
   * The active fixture map for the current scenario
   */
  fixtures: FixtureMap

  /**
   * Timestamp when demo mode was last enabled
   * Useful for session timeout logic
   */
  enabledAt: number | null
}

/**
 * Create initial demo state
 *
 * @param initialEnabled - Whether demo mode should start enabled
 * @param fixtures - Initial fixture map
 * @returns A new DemoState object
 *
 * @example
 * const state = createDemoState(false, {
 *   'GET /api/users': () => [{ id: '1', name: 'Demo User' }],
 * })
 */
export function createDemoState(
  initialEnabled: boolean = false,
  fixtures: FixtureMap = {}
): DemoState {
  return {
    enabled: initialEnabled,
    scenario: null,
    fixtures,
    enabledAt: initialEnabled ? Date.now() : null,
  }
}

/**
 * Options for creating a demo state store
 */
export interface DemoStateStoreOptions {
  /**
   * Initial enabled state
   * @default false
   */
  initialEnabled?: boolean

  /**
   * Initial fixtures
   * @default {}
   */
  fixtures?: FixtureMap

  /**
   * Available scenarios with their fixtures
   */
  scenarios?: Record<string, FixtureMap>

  /**
   * Callback when state changes
   */
  onChange?: (state: DemoState) => void
}

/**
 * A minimal state store for demo mode
 * Framework adapters can use this or integrate with their own state management
 */
export interface DemoStateStore {
  /**
   * Get the current state
   */
  getState(): DemoState

  /**
   * Enable demo mode
   */
  enable(): void

  /**
   * Disable demo mode
   */
  disable(): void

  /**
   * Toggle demo mode
   */
  toggle(): boolean

  /**
   * Set the active scenario
   * @param name - Scenario name (or null to clear)
   */
  setScenario(name: string | null): void

  /**
   * Update fixtures (merges with existing)
   */
  updateFixtures(fixtures: FixtureMap): void

  /**
   * Replace all fixtures
   */
  setFixtures(fixtures: FixtureMap): void

  /**
   * Subscribe to state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: (state: DemoState) => void): () => void
}

/**
 * Create a demo state store
 *
 * This is a minimal, framework-agnostic state store that can be used
 * directly or wrapped by framework-specific adapters (React, Vue, etc.)
 *
 * @param options - Store configuration options
 * @returns A DemoStateStore instance
 *
 * @example
 * const store = createDemoStateStore({
 *   initialEnabled: false,
 *   fixtures: {
 *     'GET /api/users': () => [{ id: '1', name: 'Demo User' }],
 *   },
 *   scenarios: {
 *     'empty-state': { 'GET /api/users': () => [] },
 *     'error-state': { 'GET /api/users': () => { throw new Error('API Error') } },
 *   },
 * })
 *
 * // Subscribe to changes
 * const unsubscribe = store.subscribe((state) => {
 *   console.log('Demo mode:', state.enabled)
 * })
 *
 * // Enable demo mode
 * store.enable()
 *
 * // Switch scenario
 * store.setScenario('empty-state')
 */
export function createDemoStateStore(options: DemoStateStoreOptions = {}): DemoStateStore {
  const {
    initialEnabled = false,
    fixtures = {},
    scenarios = {},
    onChange,
  } = options

  let state = createDemoState(initialEnabled, fixtures)
  const listeners = new Set<(state: DemoState) => void>()

  function notify() {
    listeners.forEach((listener) => listener(state))
    onChange?.(state)
  }

  function setState(updates: Partial<DemoState>) {
    state = { ...state, ...updates }
    notify()
  }

  return {
    getState() {
      return state
    },

    enable() {
      if (!state.enabled) {
        setState({ enabled: true, enabledAt: Date.now() })
      }
    },

    disable() {
      if (state.enabled) {
        setState({ enabled: false, enabledAt: null })
      }
    },

    toggle() {
      const newEnabled = !state.enabled
      setState({
        enabled: newEnabled,
        enabledAt: newEnabled ? Date.now() : null,
      })
      return newEnabled
    },

    setScenario(name: string | null) {
      if (name === null) {
        setState({ scenario: null, fixtures })
      } else if (scenarios[name]) {
        setState({ scenario: name, fixtures: { ...fixtures, ...scenarios[name] } })
      } else {
        console.warn(`[DemoKit] Unknown scenario: ${name}`)
      }
    },

    updateFixtures(newFixtures: FixtureMap) {
      setState({ fixtures: { ...state.fixtures, ...newFixtures } })
    },

    setFixtures(newFixtures: FixtureMap) {
      setState({ fixtures: newFixtures })
    },

    subscribe(listener: (state: DemoState) => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}