/**
 * Default localStorage key for demo mode state
 */
export const DEFAULT_STORAGE_KEY = 'demokit-mode'

/**
 * Check if localStorage is available (handles SSR and restricted contexts)
 */
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__demokit_test__'
    if (typeof window === 'undefined' || !window.localStorage) {
      return false
    }
    window.localStorage.setItem(testKey, testKey)
    window.localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/**
 * Load demo mode state from localStorage
 *
 * @param key - localStorage key to use
 * @returns Current demo mode state, or false if not set or unavailable
 */
export function loadDemoState(key: string = DEFAULT_STORAGE_KEY): boolean {
  if (!isLocalStorageAvailable()) {
    return false
  }

  try {
    const value = window.localStorage.getItem(key)
    return value === 'true'
  } catch {
    return false
  }
}

/**
 * Save demo mode state to localStorage
 *
 * @param key - localStorage key to use
 * @param enabled - Whether demo mode is enabled
 */
export function saveDemoState(
  key: string = DEFAULT_STORAGE_KEY,
  enabled: boolean
): void {
  if (!isLocalStorageAvailable()) {
    return
  }

  try {
    if (enabled) {
      window.localStorage.setItem(key, 'true')
    } else {
      window.localStorage.removeItem(key)
    }
  } catch {
    // Silently fail if storage is full or restricted
  }
}

/**
 * Clear demo mode state from localStorage
 *
 * @param key - localStorage key to use
 */
export function clearDemoState(key: string = DEFAULT_STORAGE_KEY): void {
  if (!isLocalStorageAvailable()) {
    return
  }

  try {
    window.localStorage.removeItem(key)
  } catch {
    // Silently fail
  }
}
