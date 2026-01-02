import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from '@remix-run/react'
import { DemoRemixProvider } from '@demokit-ai/remix'
import { isDemoMode } from '@demokit-ai/remix/server'
import { Header } from '~/components/Header'
import { loaderFixtures, actionFixtures } from '~/demo/fixtures'
import './styles/app.css'

export const meta: MetaFunction = () => {
  return [
    { title: 'TechShop - DemoKit E-commerce Demo' },
    {
      name: 'description',
      content: 'A demo e-commerce application showcasing @demokit-ai/remix integration',
    },
  ]
}

export async function loader({ request }: LoaderFunctionArgs) {
  const demoEnabled = isDemoMode(request)
  return json({ isDemoMode: demoEnabled })
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  const { isDemoMode } = useLoaderData<typeof loader>()

  return (
    <DemoRemixProvider
      enabled={isDemoMode}
      loaders={loaderFixtures}
      actions={actionFixtures}
    >
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <footer className="border-t border-gray-200 bg-white py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-gray-500">
              This is a demo application powered by{' '}
              <a
                href="https://github.com/demokit-ai/demokit"
                className="font-medium text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                DemoKit
              </a>
              . Toggle demo mode to see fixture data.
            </p>
          </div>
        </footer>
      </div>
    </DemoRemixProvider>
  )
}

export function ErrorBoundary() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-gray-50">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900">Oops!</h1>
            <p className="mt-2 text-gray-600">Something went wrong.</p>
            <a
              href="/"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
            >
              Go Home
            </a>
          </div>
        </div>
        <Scripts />
      </body>
    </html>
  )
}
