import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { isDemoEnabled, toggleDemoMode } from '@/lib/demo-mode'

/**
 * Demo mode toggle component
 *
 * Allows users to enable/disable demo mode.
 * When toggled, reloads the current route to use fixtures or real data.
 */
export default function DemoToggle() {
  const [enabled, setEnabled] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Sync with localStorage on mount
  useEffect(() => {
    setEnabled(isDemoEnabled())
  }, [])

  const handleToggle = () => {
    const newState = toggleDemoMode()
    setEnabled(newState)

    // Reload the current route to apply the change
    // Using navigate with the same path forces a data reload
    navigate(location.pathname + location.search, { replace: true })

    // Force a full page reload to ensure router picks up the change
    window.location.reload()
  }

  return (
    <button
      onClick={handleToggle}
      className={`
        flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors
        ${enabled ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
      `}
      title={enabled ? 'Demo mode is enabled - using mock data' : 'Demo mode is disabled'}
    >
      <span
        className={`h-2 w-2 rounded-full ${enabled ? 'animate-pulse bg-green-500' : 'bg-gray-400'}`}
      />
      {enabled ? 'Demo Mode' : 'Live Mode'}
    </button>
  )
}
