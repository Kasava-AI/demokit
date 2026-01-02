import { Outlet } from 'react-router-dom'
import Header from '@/components/Header'

/**
 * Root layout component with header
 */
export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>
        <Outlet />
      </main>
    </div>
  )
}
