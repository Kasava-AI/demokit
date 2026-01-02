'use client'

import { useState, useEffect } from 'react'
import { useNextDemoMode } from '@demokit-ai/next/client'

export function DemoToggle() {
  const { isDemoMode, enableDemo, disableDemo, enableWithScenario, currentScenario, isHydrated } = useNextDemoMode()
  const [showDropdown, setShowDropdown] = useState(false)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = () => setShowDropdown(false)
    if (showDropdown) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [showDropdown])

  if (!isHydrated) {
    return (
      <div className="w-24 h-8 bg-gray-100 rounded animate-pulse" />
    )
  }

  const scenarios = [
    { id: 'fresh-start', label: 'Fresh Start' },
    { id: 'with-cart', label: 'With Cart Items' },
    { id: 'low-stock', label: 'Low Stock' },
    { id: 'with-orders', label: 'Order History' },
  ]

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (isDemoMode) {
            setShowDropdown(!showDropdown)
          } else {
            enableDemo()
          }
        }}
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
            Demo {currentScenario && `(${currentScenario})`}
          </span>
        ) : (
          'Try Demo'
        )}
      </button>

      {/* Dropdown for scenarios */}
      {showDropdown && isDemoMode && (
        <div
          className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
            Scenarios
          </div>
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => {
                enableWithScenario(scenario.id)
                setShowDropdown(false)
              }}
              className={`
                w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors
                ${currentScenario === scenario.id ? 'text-purple-600 font-medium' : 'text-gray-700'}
              `}
            >
              {scenario.label}
            </button>
          ))}
          <hr className="my-1 border-gray-200" />
          <button
            onClick={() => {
              disableDemo()
              setShowDropdown(false)
            }}
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            Exit Demo Mode
          </button>
        </div>
      )}
    </div>
  )
}
