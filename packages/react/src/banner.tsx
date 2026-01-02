'use client'

import { useDemoMode } from './hooks'
import { PoweredByBadge } from './powered-by'
import type { DemoModeBannerProps } from './types'

/**
 * Eye icon SVG component
 */
function EyeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

/**
 * Default styles for the banner
 */
const defaultStyles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    backgroundColor: '#fef3c7',
    borderBottom: '1px solid rgba(217, 119, 6, 0.2)',
    fontSize: '14px',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  } as React.CSSProperties,
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,
  icon: {
    color: '#d97706',
    flexShrink: 0,
  } as React.CSSProperties,
  label: {
    fontWeight: 600,
    color: '#78350f',
  } as React.CSSProperties,
  description: {
    color: 'rgba(120, 53, 15, 0.7)',
    fontSize: '12px',
  } as React.CSSProperties,
  button: {
    padding: '4px 12px',
    fontSize: '14px',
    backgroundColor: 'transparent',
    border: '1px solid rgba(217, 119, 6, 0.3)',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#78350f',
    fontFamily: 'inherit',
    transition: 'background-color 0.15s ease',
  } as React.CSSProperties,
}

/**
 * A ready-to-use banner component that shows when demo mode is active
 *
 * Displays a prominent amber banner with a label, description, and exit button.
 * Automatically hides when demo mode is disabled or before hydration.
 *
 * @example
 * function App() {
 *   return (
 *     <DemoKitProvider fixtures={fixtures}>
 *       <DemoModeBanner />
 *       <YourApp />
 *     </DemoKitProvider>
 *   )
 * }
 *
 * @example Custom labels
 * <DemoModeBanner
 *   demoLabel="Preview Mode"
 *   description="You're viewing sample data"
 *   exitLabel="Exit Preview"
 * />
 */
export function DemoModeBanner({
  className = '',
  exitLabel = 'Exit Demo Mode',
  demoLabel = 'Demo Mode Active',
  description = 'Changes are simulated and not saved',
  showIcon = true,
  showPoweredBy = true,
  poweredByUrl = 'https://demokit.ai',
  style,
  onExit,
}: DemoModeBannerProps) {
  const { isDemoMode, isHydrated, disable } = useDemoMode()

  // Don't render until hydrated to avoid hydration mismatch
  if (!isHydrated || !isDemoMode) {
    return null
  }

  const handleExit = () => {
    if (onExit) {
      onExit()
    } else {
      disable()
    }
  }

  // For OSS users, branding is always shown (enforced server-side in cloud)
  // The prop is only respected for paid cloud users
  const effectiveShowPoweredBy = showPoweredBy

  return (
    <div
      className={`demokit-banner ${className}`.trim()}
      style={{ ...defaultStyles.container, flexDirection: 'column', gap: '4px', ...style }}
      role="status"
      aria-live="polite"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={defaultStyles.content}>
          {showIcon && (
            <span style={defaultStyles.icon}>
              <EyeIcon />
            </span>
          )}
          <span style={defaultStyles.label}>{demoLabel}</span>
          {description && <span style={defaultStyles.description}>{description}</span>}
        </div>
        <button
          onClick={handleExit}
          style={defaultStyles.button}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(217, 119, 6, 0.1)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
          type="button"
        >
          {exitLabel}
        </button>
      </div>
      {effectiveShowPoweredBy && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <PoweredByBadge url={poweredByUrl} size="xs" />
        </div>
      )}
    </div>
  )
}
