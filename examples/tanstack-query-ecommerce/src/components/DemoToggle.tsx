import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { isDemoEnabled, toggleDemoMode } from '@/lib/demo-mode'

/**
 * Demo mode toggle component
 *
 * Allows users to enable/disable demo mode.
 * When toggled, reloads the page to use fixtures or real data.
 */
export default function DemoToggle() {
  const [enabled, setEnabled] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  // Sync with localStorage on mount
  useEffect(() => {
    setEnabled(isDemoEnabled())
  }, [])

  const handleToggle = () => {
    const newState = toggleDemoMode()
    setEnabled(newState)

    // Navigate to force route refresh, then reload
    navigate(location.pathname + location.search, { replace: true })

    // Force a full page reload to ensure QueryClient picks up the change
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
