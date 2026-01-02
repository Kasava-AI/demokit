'use client'

import { useDemoMode } from '@/app/providers'

export function DemoToggle() {
  const { isDemoMode, isHydrated, enableDemo, disableDemo } = useDemoMode()

  if (!isHydrated) {
    return (
      <div className="w-24 h-8 bg-gray-100 rounded animate-pulse" />
    )
  }

  return (
    <button
      onClick={() => isDemoMode ? disableDemo() : enableDemo()}
      className={`
        px-3 py-1.5 text-sm font-medium rounded-lg transition-all
        ${isDemoMode
          ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }
      `}
    >
      {isDemoMode ? (
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
          Demo Mode
        </span>
      ) : (
        'Try Demo'
      )}
    </button>
  )
}
