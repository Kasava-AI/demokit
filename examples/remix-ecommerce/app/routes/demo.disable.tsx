import type { ActionFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { clearDemoModeCookie } from '@demokit-ai/remix/server'

/**
 * Action to disable demo mode
 * Clears the demo mode cookie
 */
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const redirectTo = (formData.get('redirectTo') as string) || '/'

  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': clearDemoModeCookie(),
    },
  })
}

/**
 * GET request also disables demo mode (for direct linking)
 */
export async function loader({ request }: ActionFunctionArgs) {
  const url = new URL(request.url)
  const redirectTo = url.searchParams.get('redirectTo') || '/'

  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': clearDemoModeCookie(),
    },
  })
}
