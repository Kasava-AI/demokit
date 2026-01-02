import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

/**
 * Standard API error response structure.
 */
export interface ApiError {
  error: string
  code?: string
  details?: unknown
}

/**
 * Return a 401 Unauthorized response.
 */
export function unauthorized(message = 'Unauthorized'): NextResponse<ApiError> {
  return NextResponse.json({ error: message, code: 'UNAUTHORIZED' }, { status: 401 })
}

/**
 * Return a 403 Forbidden response.
 */
export function forbidden(message = 'Forbidden'): NextResponse<ApiError> {
  return NextResponse.json({ error: message, code: 'FORBIDDEN' }, { status: 403 })
}

/**
 * Return a 404 Not Found response.
 */
export function notFound(resource = 'Resource'): NextResponse<ApiError> {
  return NextResponse.json(
    { error: `${resource} not found`, code: 'NOT_FOUND' },
    { status: 404 }
  )
}

/**
 * Return a 400 Bad Request response.
 */
export function badRequest(message: string, details?: unknown): NextResponse<ApiError> {
  return NextResponse.json(
    { error: message, code: 'BAD_REQUEST', details },
    { status: 400 }
  )
}

/**
 * Return a 500 Internal Server Error response.
 */
export function serverError(message = 'Internal server error'): NextResponse<ApiError> {
  return NextResponse.json(
    { error: message, code: 'INTERNAL_ERROR' },
    { status: 500 }
  )
}

/**
 * Handle errors in API routes with consistent responses.
 * Logs the error and returns an appropriate HTTP response.
 */
export function handleError(error: unknown, context: string): NextResponse<ApiError> {
  console.error(`[${context}]`, error)

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: error.issues,
      },
      { status: 400 }
    )
  }

  if (error instanceof Error) {
    // Don't expose internal error messages in production
    const message =
      process.env.NODE_ENV === 'development'
        ? error.message
        : 'Internal server error'
    return serverError(message)
  }

  return serverError()
}
