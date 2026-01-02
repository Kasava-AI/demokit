import { Form, useLocation } from '@remix-run/react'
import { useIsDemoRemixMode } from '@demokit-ai/remix'

export function DemoToggle() {
  const isDemo = useIsDemoRemixMode()
  const location = useLocation()

  return (
    <Form
      action={isDemo ? '/demo/disable' : '/demo/enable'}
      method="post"
      className="flex items-center gap-2"
    >
      <input type="hidden" name="redirectTo" value={location.pathname + location.search} />

      <button
        type="submit"
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          isDemo ? 'bg-blue-600' : 'bg-gray-200'
        }`}
        title={isDemo ? 'Disable demo mode' : 'Enable demo mode'}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            isDemo ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>

      <span className="text-sm font-medium text-gray-700">
        Demo
        {isDemo && (
          <span className="ml-1 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
            ON
          </span>
        )}
      </span>
    </Form>
  )
}
