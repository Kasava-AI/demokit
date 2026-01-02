import type { Metadata } from 'next'
import { Providers } from './providers'
import { Header } from './components/Header'
import { DemoModeBanner } from './components/DemoModeBanner'
import './globals.css'

export const metadata: Metadata = {
  title: 'TechShop - tRPC DemoKit Example',
  description: 'A tRPC e-commerce demo showcasing DemoKit integration with type-safe fixtures',
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
          <DemoModeBanner />
          <Header />
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
