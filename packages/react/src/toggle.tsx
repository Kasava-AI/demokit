'use client'

import type { CSSProperties } from 'react'
import { useDemoMode } from './hooks'
import { PoweredByBadge } from './powered-by'

/**
 * Props for the DemoModeToggle component
 */
export interface DemoModeToggleProps {
  /**
   * Show "Demo Mode" label next to the toggle
   * @default true
   */
  showLabel?: boolean

  /**
   * Label text to display
   * @default 'Demo Mode'
   */
  label?: string

  /**
   * Show "Powered by DemoKit" branding
   * Note: For OSS users, this is always true regardless of the prop value.
   * Only paid DemoKit Cloud users can hide the branding.
   * @default true
   */
  showPoweredBy?: boolean

  /**
   * URL for the "Powered by" link
   * @default 'https://demokit.ai'
   */
  poweredByUrl?: string

  /**
   * Position of the toggle
   * - 'inline': Renders where placed in the component tree
   * - 'floating': Fixed position, can be moved around
   * - 'corner': Fixed to bottom-right corner
   * @default 'inline'
   */
  position?: 'inline' | 'floating' | 'corner'

  /**
   * Size of the toggle
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Additional CSS class name
   */
  className?: string

  /**
   * Custom styles
   */
  style?: CSSProperties

  /**
   * Callback when toggle state changes
   */
  onChange?: (enabled: boolean) => void
}

/**
 * Size configurations for the toggle
 */
const sizeConfig = {
  sm: {
    trackWidth: 36,
    trackHeight: 20,
    thumbSize: 16,
    thumbOffset: 2,
    fontSize: '12px',
    padding: '8px 12px',
    gap: '8px',
  },
  md: {
    trackWidth: 44,
    trackHeight: 24,
    thumbSize: 20,
    thumbOffset: 2,
    fontSize: '14px',
    padding: '12px 16px',
    gap: '10px',
  },
  lg: {
    trackWidth: 52,
    trackHeight: 28,
    thumbSize: 24,
    thumbOffset: 2,
    fontSize: '16px',
    padding: '16px 20px',
    gap: '12px',
  },
}

/**
 * Position configurations
 */
const positionStyles: Record<string, CSSProperties> = {
  inline: {},
  floating: {
    position: 'fixed',
    zIndex: 9999,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    borderRadius: '8px',
  },
  corner: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 9999,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    borderRadius: '8px',
  },
}

/**
 * Default styles
 */
const defaultStyles = {
  container: {
    display: 'inline-flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    gap: '4px',
    backgroundColor: '#ffffff',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  label: {
    fontWeight: 500,
    color: '#1f2937',
    userSelect: 'none' as const,
  },
  track: {
    position: 'relative' as const,
    borderRadius: '9999px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    flexShrink: 0,
  },
  trackOff: {
    backgroundColor: '#d1d5db',
  },
  trackOn: {
    backgroundColor: '#d97706',
  },
  thumb: {
    position: 'absolute' as const,
    top: '50%',
    transform: 'translateY(-50%)',
    backgroundColor: '#ffffff',
    borderRadius: '50%',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
    transition: 'left 0.2s ease',
  },
  poweredByContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    width: '100%',
  },
}

/**
 * A toggle switch component for enabling/disabling demo mode
 *
 * Supports inline placement or fixed positioning (floating/corner).
 * Includes optional "Powered by DemoKit" branding that is always shown for OSS users.
 *
 * @example Basic inline usage
 * <DemoModeToggle />
 *
 * @example Corner position (floating)
 * <DemoModeToggle position="corner" />
 *
 * @example Without label
 * <DemoModeToggle showLabel={false} />
 *
 * @example With custom label and callback
 * <DemoModeToggle
 *   label="Preview Mode"
 *   onChange={(enabled) => console.log('Demo mode:', enabled)}
 * />
 */
export function DemoModeToggle({
  showLabel = true,
  label = 'Demo Mode',
  showPoweredBy = true,
  poweredByUrl = 'https://demokit.ai',
  position = 'inline',
  size = 'md',
  className = '',
  style,
  onChange,
}: DemoModeToggleProps) {
  const { isDemoMode, isHydrated, toggle } = useDemoMode()

  // Don't render until hydrated to avoid hydration mismatch
  if (!isHydrated) {
    return null
  }

  const config = sizeConfig[size]
  const posStyle = positionStyles[position]

  const handleToggle = () => {
    toggle()
    onChange?.(!isDemoMode)
  }

  const thumbLeft = isDemoMode
    ? config.trackWidth - config.thumbSize - config.thumbOffset
    : config.thumbOffset

  // For OSS users, branding is always shown (enforced server-side in cloud)
  // The prop is only respected for paid cloud users
  const effectiveShowPoweredBy = showPoweredBy

  return (
    <div
      className={`demokit-toggle ${className}`.trim()}
      style={{
        ...defaultStyles.container,
        padding: config.padding,
        ...posStyle,
        ...style,
      }}
      role="group"
      aria-label="Demo mode toggle"
    >
      <div style={{ ...defaultStyles.row, gap: config.gap }}>
        {showLabel && (
          <span style={{ ...defaultStyles.label, fontSize: config.fontSize }}>{label}</span>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={isDemoMode}
          aria-label={`${label}: ${isDemoMode ? 'On' : 'Off'}`}
          onClick={handleToggle}
          style={{
            ...defaultStyles.track,
            ...(isDemoMode ? defaultStyles.trackOn : defaultStyles.trackOff),
            width: config.trackWidth,
            height: config.trackHeight,
            border: 'none',
            padding: 0,
          }}
        >
          <span
            style={{
              ...defaultStyles.thumb,
              width: config.thumbSize,
              height: config.thumbSize,
              left: thumbLeft,
            }}
          />
        </button>
      </div>
      {effectiveShowPoweredBy && (
        <div style={defaultStyles.poweredByContainer}>
          <PoweredByBadge url={poweredByUrl} size="xs" />
        </div>
      )}
    </div>
  )
}
