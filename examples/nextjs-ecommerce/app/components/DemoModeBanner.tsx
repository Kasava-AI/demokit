'use client'

import { useNextDemoMode } from '@demokit-ai/next/client'

export function DemoModeBanner() {
  const { isDemoMode, disableDemo, currentScenario, isHydrated } = useNextDemoMode()

  if (!isHydrated || !isDemoMode) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="font-medium">Demo Mode Active</span>
            </span>
            {currentScenario && (
              <span className="text-purple-200 text-sm">
                Scenario: {currentScenario}
              </span>
            )}
            <span className="text-purple-200 text-sm hidden sm:inline">
              | Changes are simulated and not saved
            </span>
          </div>
          <button
            onClick={disableDemo}
            className="text-sm px-3 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
          >
            Exit Demo
          </button>
        </div>
      </div>
    </div>
  )
}
