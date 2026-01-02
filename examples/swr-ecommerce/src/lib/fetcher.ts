/**
 * Default fetcher for SWR
 *
 * Makes a GET request to the URL and returns the JSON response
 */
export const fetcher = async <T>(url: string): Promise<T> => {
  const response = await fetch(url)

  if (!response.ok) {
    const error = new Error('An error occurred while fetching the data.')
    throw error
  }

  return response.json()
}

/**
 * POST fetcher for mutations
 */
export const postFetcher = async <T>(
  url: string,
  { arg }: { arg: Record<string, unknown> }
): Promise<T> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(arg),
  })

  if (!response.ok) {
    const error = new Error('An error occurred while submitting the data.')
    throw error
  }

  return response.json()
}
