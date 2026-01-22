import { useQuery, type UseQueryOptions } from 'react-query'

/**
 * Client calls your Next API route (same-origin) to avoid CORS.
 * Create /pages/api/messagesigns.ts (or /app/api/messagesigns/route.ts) to proxy UDOT.
 */
const DEFAULT_API_ROUTE = '/api/messagesigns'

export interface OverheadDigitalSign {
  Id: number
  Name: string
  Roadway: string
  DirectionOfTravel: string
  Messages: string[]
  Latitude: number
  Longitude: number
  LastUpdated: string
}

export type OverheadDigitalSignsResponse = OverheadDigitalSign[]

async function fetchOverheadDigitalSigns({
  signal,
  apiRoute = DEFAULT_API_ROUTE,
}: {
  signal?: AbortSignal
  apiRoute?: string
}): Promise<OverheadDigitalSignsResponse> {
  const res = await fetch(apiRoute, {
    method: 'GET',
    signal,
    headers: { Accept: 'application/json' },
  })

  // Try to read a useful error body, but don't assume JSON.
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `Message signs request failed (${res.status} ${res.statusText})${
        text ? `: ${text}` : ''
      }`
    )
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) return res.json()

  // If your proxy ever returns text, still return something useful.
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return text as unknown as OverheadDigitalSignsResponse
  }
}

export function useOverheadDigitalSigns(
  opts?: Omit<
    UseQueryOptions<
      OverheadDigitalSignsResponse,
      Error,
      OverheadDigitalSignsResponse,
      readonly ['udot', 'messageSigns', string]
    >,
    'queryKey' | 'queryFn'
  > & { apiRoute?: string }
) {
  const apiRoute = opts?.apiRoute ?? DEFAULT_API_ROUTE

  return useQuery({
    queryKey: ['udot', 'messageSigns', apiRoute] as const,
    queryFn: ({ signal }) =>
      fetchOverheadDigitalSigns({
        signal,
        apiRoute,
      }),
    refetchOnWindowFocus: false,
    ...opts,
  })
}
