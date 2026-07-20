'use client'

import { useEffect, useRef } from 'react'

export interface MutationBlockedToastProps {
  /** Text describing the blocked action, e.g. "POST /api/users" */
  notice: string | null
  /** Called when the toast auto-dismisses or is clicked */
  onDismiss: () => void
  /** Auto-dismiss delay in ms @default 4000 */
  duration?: number
}

/**
 * Small fixed toast shown when demo mode blocks a mutation that has no fixture.
 * Rendered automatically by DemoKitProvider unless showBlockedToast is false.
 */
export function MutationBlockedToast({
  notice,
  onDismiss,
  duration = 4000,
}: MutationBlockedToastProps) {
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => onDismissRef.current(), duration)
    return () => clearTimeout(timer)
  }, [notice, duration])

  if (!notice) return null

  return (
    <div
      role="status"
      onClick={onDismiss}
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        padding: '10px 16px',
        borderRadius: 8,
        background: '#1f2937',
        color: '#f9fafb',
        fontSize: 13,
        fontFamily: 'system-ui, sans-serif',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        cursor: 'pointer',
      }}
    >
      This action isn&apos;t part of the demo ({notice})
    </div>
  )
}
