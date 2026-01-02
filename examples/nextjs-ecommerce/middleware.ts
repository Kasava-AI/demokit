import { demoMiddleware } from '@demokit-ai/next/middleware'

// Create the demo middleware
export const middleware = demoMiddleware({
  cookieName: 'ecommerce-demo-mode',
  urlParam: 'demo',
})

// Configure which routes the middleware should run on
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
