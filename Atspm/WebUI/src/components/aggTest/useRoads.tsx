// hooks/useUgrcNearbyRoads.ts
import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchRoadsNear } from './roads'

type Loc = { id: string; lat: number; lng: number }
type RoadSeg = {
  coordinates: [number, number][]
  properties?: Record<string, any>
}

export function useUgrcNearbyRoads(
  locations: Loc[],
  radiusMeters = 120,
  maxParallel = 3,
  delayMs = 150
) {
  const [roadsByLocation, setRoads] = useState<Record<string, RoadSeg[]>>({})
  const queueRef = useRef<Loc[]>([])
  const inflightRef = useRef(0)

  const wanted = useMemo(
    () => locations.map((l) => ({ id: l.id, lat: l.lat, lng: l.lng })),
    [locations]
  )

  useEffect(() => {
    const missing = wanted.filter((l) => roadsByLocation[l.id] === undefined)
    if (missing.length === 0) return

    queueRef.current = missing
    let cancelled = false
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

    const pump = async () => {
      while (!cancelled && queueRef.current.length) {
        if (inflightRef.current >= maxParallel) {
          await sleep(40)
          continue
        }
        const loc = queueRef.current.shift()!
        inflightRef.current++
        fetchRoadsNear(loc.lat, loc.lng, radiusMeters)
          .then((segs) => setRoads((prev) => ({ ...prev, [loc.id]: segs })))
          .catch(() => setRoads((prev) => ({ ...prev, [loc.id]: [] })))
          .finally(async () => {
            inflightRef.current--
            await sleep(delayMs)
          })
      }
    }

    pump()
    return () => {
      cancelled = true
    }
  }, [wanted, radiusMeters, maxParallel, delayMs, roadsByLocation])

  return roadsByLocation
}
