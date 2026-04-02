'use client'

import { useCallback } from 'react'
import { useDemoMode } from './hooks'

export interface UseDemoGuardOptions {
  /**
   * Called when a mutation is blocked in demo mode.
   * Use this to show a toast or notification to the user.
   * @param message - The action name or a default message
   */
  onBlocked?: (message: string) => void
}

export interface DemoGuardReturn {
  /**
   * Whether demo mode is currently active
   */
  isDemoMode: boolean

  /**
   * Wraps a mutation action — prevents execution in demo mode.
   * When blocked, calls `onBlocked` with the action name.
   *
   * @param action - The mutation function to execute (only runs if NOT in demo mode)
   * @param actionName - Human-readable name (e.g., "Changes saved")
   * @returns `true` if the action was executed, `false` if blocked
   *
   * @example
   * ```tsx
   * const { guardMutation } = useDemoGuard({
   *   onBlocked: (msg) => toast.success(msg)
   * })
   *
   * guardMutation(() => sdk.deleteItem(id), 'Item deleted')
   * ```
   */
  guardMutation: (
    action: () => void | Promise<void>,
    actionName?: string
  ) => boolean
}

/**
 * Hook that prevents mutations from executing in demo mode.
 *
 * Instead of letting mutations hit the (intercepted) API and trigger
 * side effects like optimistic updates and onSuccess handlers, this
 * hook blocks the mutation entirely and optionally notifies the user.
 *
 * @example
 * ```tsx
 * import { useDemoGuard } from '@demokit-ai/react'
 * import { toast } from 'sonner'
 *
 * function MyComponent() {
 *   const { guardMutation } = useDemoGuard({
 *     onBlocked: (msg) => toast.success(msg, {
 *       description: 'Changes are not saved. Exit demo mode to make real changes.',
 *     })
 *   })
 *
 *   const handleDelete = () => {
 *     guardMutation(() => sdk.deleteItem(id), 'Item deleted')
 *   }
 * }
 * ```
 */
export function useDemoGuard(options: UseDemoGuardOptions = {}): DemoGuardReturn {
  const { isDemoMode } = useDemoMode()
  const { onBlocked } = options

  const guardMutation = useCallback(
    (action: () => void | Promise<void>, actionName?: string): boolean => {
      if (isDemoMode) {
        const message = actionName
          ? `${actionName} (simulated in demo mode)`
          : 'Action simulated in demo mode'

        onBlocked?.(message)
        return false
      }

      action()
      return true
    },
    [isDemoMode, onBlocked]
  )

  return {
    guardMutation,
    isDemoMode,
  }
}
