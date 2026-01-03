import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Providers } from './providers'
import { Header } from './components/Header'
import { DemoModeBanner } from './components/DemoModeBanner'
import './globals.css'

export const metadata: Metadata = {
  title: 'TechShop - DemoKit E-commerce Example',
  description: 'A Next.js e-commerce demo showcasing DemoKit integration',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <Providers>
          <Suspense fallback={null}>
            <DemoModeBanner />
          </Suspense>
          <Suspense fallback={<div className="h-16" />}>
            <Header />
          </Suspense>
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
