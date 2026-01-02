import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { DemoRouterProvider } from '@demokit-ai/react-router'

import { router } from '@/router'
import { loaderFixtures, actionFixtures } from '@/demo/fixtures'
import { isDemoEnabled } from '@/lib/demo-mode'

import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DemoRouterProvider
      enabled={isDemoEnabled()}
      loaders={loaderFixtures}
      actions={actionFixtures}
      delay={200}
    >
      <RouterProvider router={router} />
    </DemoRouterProvider>
  </StrictMode>
)
