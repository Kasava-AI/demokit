/**
 * Generate Next.js middleware for handling ?demo=true URL parameter.
 */
export function generateMiddlewareFile(): string {
  return `import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COOKIE_NAME = 'demokit-demo-mode'

/**
 * Middleware to handle ?demo=true URL parameter.
 * Sets a cookie so demo mode persists across navigation.
 */
export function middleware(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const demo = searchParams.get('demo')

  if (demo === 'true') {
    const response = NextResponse.next()
    response.cookies.set(COOKIE_NAME, 'true', {
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    })
    return response
  }

  if (demo === 'false') {
    const response = NextResponse.next()
    response.cookies.delete(COOKIE_NAME)
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
`
}
