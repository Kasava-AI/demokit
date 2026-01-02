import type { ActionFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { createDemoModeCookie } from '@demokit-ai/remix/server'

/**
 * Action to enable demo mode
 * Sets a cookie to persist demo mode across requests
 */
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const redirectTo = (formData.get('redirectTo') as string) || '/'

  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': createDemoModeCookie(true),
    },
  })
}

/**
 * GET request also enables demo mode (for direct linking)
 */
export async function loader({ request }: ActionFunctionArgs) {
  const url = new URL(request.url)
  const redirectTo = url.searchParams.get('redirectTo') || '/'

  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': createDemoModeCookie(true),
    },
  })
}
