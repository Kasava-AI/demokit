'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ui/theme-toggle'

function ResetPasswordContent() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isValidToken, setIsValidToken] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  // Check if we have a valid session from the reset link
  useEffect(() => {
    const checkSession = async () => {
      if (!supabase) {
        setError('Authentication is not configured.')
        setIsLoading(false)
        return
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session) {
          setIsValidToken(true)
        } else {
          setError('Invalid or expired reset link. Please request a new password reset.')
        }
      } catch {
        setError('Failed to verify reset link.')
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!supabase) {
      setError('Authentication is not configured.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        throw error
      }

      setSuccessMessage('Password updated successfully. Redirecting to login...')

      // Sign out and redirect to login
      await supabase.auth.signOut()
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to update password')
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-extrabold text-foreground">
            DemoKit
          </h1>
          <h2 className="mt-6 text-center text-xl text-muted-foreground">
            Reset your password
          </h2>
        </div>

        {!isValidToken ? (
          <div className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <p className="text-center text-sm text-muted-foreground">
              <a href="/login" className="font-medium text-primary hover:text-primary/80">
                Return to login
              </a>
            </p>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-destructive/10 p-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="rounded-md bg-primary/10 p-4">
                <p className="text-sm text-primary">{successMessage}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground"
                >
                  New Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-input rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
                  placeholder="********"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-foreground"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-input rounded-lg shadow-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
                  placeholder="********"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Updating password...' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}
