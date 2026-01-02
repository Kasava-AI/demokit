'use client'

import type { CSSProperties } from 'react'

/**
 * Props for the PoweredByBadge component
 */
export interface PoweredByBadgeProps {
  /**
   * URL to link to when clicked
   * @default 'https://demokit.ai'
   */
  url?: string

  /**
   * Visual variant for light/dark backgrounds
   * @default 'auto'
   */
  variant?: 'light' | 'dark' | 'auto'

  /**
   * Size of the badge
   * @default 'sm'
   */
  size?: 'xs' | 'sm' | 'md'

  /**
   * Additional CSS class name
   */
  className?: string

  /**
   * Custom styles
   */
  style?: CSSProperties
}

/**
 * External link icon
 */
function ExternalLinkIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

/**
 * Size configurations
 */
const sizeConfig = {
  xs: {
    fontSize: '10px',
    padding: '2px 6px',
    gap: '3px',
    iconSize: 8,
  },
  sm: {
    fontSize: '11px',
    padding: '3px 8px',
    gap: '4px',
    iconSize: 10,
  },
  md: {
    fontSize: '12px',
    padding: '4px 10px',
    gap: '5px',
    iconSize: 12,
  },
}

/**
 * Variant configurations
 */
const variantStyles = {
  light: {
    color: 'rgba(120, 53, 15, 0.7)',
    hoverColor: 'rgba(120, 53, 15, 0.9)',
    backgroundColor: 'transparent',
    hoverBackgroundColor: 'rgba(217, 119, 6, 0.08)',
  },
  dark: {
    color: 'rgba(255, 255, 255, 0.6)',
    hoverColor: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: 'transparent',
    hoverBackgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
}

/**
 * A "Powered by DemoKit" badge that links to demokit.ai
 *
 * This badge is shown by default for OSS users and cannot be hidden
 * without a valid DemoKit Cloud paid plan.
 *
 * @example
 * <PoweredByBadge />
 *
 * @example With dark theme
 * <PoweredByBadge variant="dark" />
 *
 * @example Small size
 * <PoweredByBadge size="xs" />
 */
export function PoweredByBadge({
  url = 'https://demokit.ai',
  variant = 'light',
  size = 'sm',
  className = '',
  style,
}: PoweredByBadgeProps) {
  const config = sizeConfig[size]
  const colors = variantStyles[variant === 'auto' ? 'light' : variant]

  const baseStyles: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: config.gap,
    fontSize: config.fontSize,
    padding: config.padding,
    color: colors.color,
    textDecoration: 'none',
    borderRadius: '4px',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWeight: 500,
    transition: 'color 0.15s ease, background-color 0.15s ease',
    whiteSpace: 'nowrap',
    ...style,
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`demokit-powered-by ${className}`.trim()}
      style={baseStyles}
      onMouseOver={(e) => {
        e.currentTarget.style.color = colors.hoverColor
        e.currentTarget.style.backgroundColor = colors.hoverBackgroundColor
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.color = colors.color
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      <span>Powered by DemoKit</span>
      <ExternalLinkIcon size={config.iconSize} />
    </a>
  )
}
