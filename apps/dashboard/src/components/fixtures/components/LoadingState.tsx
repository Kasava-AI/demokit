/**
 * LoadingState Component
 *
 * Displays a loading spinner while fixtures are being generated.
 */

export function LoadingState() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Generating fixtures...</p>
      </div>
    </div>
  );
}

/**
 * EmptyState Component
 *
 * Displays when no fixtures have been generated yet.
 */

export function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center text-muted-foreground">
        <svg
          className="mx-auto h-12 w-12 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
          />
        </svg>
        <p className="mt-2">No fixtures generated yet</p>
        <p className="text-sm">Configure a narrative and click Generate</p>
      </div>
    </div>
  );
}
