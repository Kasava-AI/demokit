import { Outlet } from 'react-router-dom'
import Header from './Header'

/**
 * Root layout with header and main content area
 */
export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t bg-white py-8">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <p className="mb-2">
            Built with{' '}
            <a
              href="https://demokit.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 hover:underline"
            >
              DemoKit
            </a>{' '}
            + SWR
          </p>
          <p>This is a demo application. No real transactions are processed.</p>
        </div>
      </footer>
    </div>
  )
}
