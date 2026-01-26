import { useQuery, type UseQueryOptions } from 'react-query'

const DEFAULT_API_ROUTE = '/api/cameras'

export interface Camera {
  Id: number
  Source: string
  SourceId: string
  Roadway: string
  Direction: string
  Latitude: number
  Longitude: number
  Location: string
  SortOrder: number
  Views: View[]
}

export interface View {
  Id: number
  Url: string
  Status: string
  Description: string
}

export type CamerasResponse = Camera[]

async function fetchCameras({
  signal,
  apiRoute = DEFAULT_API_ROUTE,
}: {
  signal?: AbortSignal
  apiRoute?: string
}): Promise<Camera[]> {
  const res = await fetch(apiRoute, {
    method: 'GET',
    signal,
    headers: { Accept: 'application/json' },
  })

  // Try to read a useful error body, but don't assume JSON.
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `Cameras request failed (${res.status} ${res.statusText})${
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
    return text as unknown as CamerasResponse
  }
}

export function useCameras(
  opts?: Omit<
    UseQueryOptions<
      CamerasResponse,
      Error,
      CamerasResponse,
      readonly ['udot', 'cameras', string]
    >,
    'queryKey' | 'queryFn'
  > & { apiRoute?: string }
) {
  const apiRoute = opts?.apiRoute ?? DEFAULT_API_ROUTE

  return useQuery({
    queryKey: ['udot', 'cameras', apiRoute] as const,
    queryFn: ({ signal }) =>
      fetchCameras({
        signal,
        apiRoute,
      }),
    refetchOnWindowFocus: false,
    ...opts,
  })
}
