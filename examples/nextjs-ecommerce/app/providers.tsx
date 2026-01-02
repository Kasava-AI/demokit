'use client'

import { DemoKitNextProvider } from '@demokit-ai/next/client'
import { demoConfig } from '@/lib/demo'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DemoKitNextProvider {...demoConfig}>
      {children}
    </DemoKitNextProvider>
  )
}
