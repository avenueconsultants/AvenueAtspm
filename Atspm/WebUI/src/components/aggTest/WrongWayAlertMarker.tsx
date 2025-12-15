import { WrongWayAlert } from '@/components/aggTest/useAlertsHubMock'
import { useMemo } from 'react'
import { CircleMarker } from 'react-leaflet'

type LatLng = { lat: number; lng: number }

type IncidentRender = {
  id: number
  ts: number
  latest: LatLng
  trail: LatLng[] // ordered old -> new
}

export function WrongWayAlertMarker({
  alerts,
  maxTrailPoints = 80,
}: {
  alerts: WrongWayAlert[]
  maxTrailPoints?: number
}) {
  const incidents = useMemo((): IncidentRender[] => {
    const latestUpdateById = new Map<number, WrongWayAlert>()
    const latestTsById = new Map<number, number>()

    for (const a of alerts ?? []) {
      if (!a || a.type !== 'object.wrong-way') continue
      if (!Array.isArray(a.log) || a.log.length === 0) continue

      let maxEntryTs = a.log[0].timestamp
      for (const e of a.log) {
        if (e.timestamp > maxEntryTs) maxEntryTs = e.timestamp
      }

      const prevTs = latestTsById.get(a.id)
      if (prevTs == null || maxEntryTs > prevTs) {
        latestTsById.set(a.id, maxEntryTs)
        latestUpdateById.set(a.id, a)
      }
    }

    const out: IncidentRender[] = []

    for (const [id, a] of latestUpdateById.entries()) {
      const log = [...a.log].sort((x, y) => x.timestamp - y.timestamp)

      const pts: LatLng[] = []
      for (const entry of log) {
        const lat = Number(entry.position?.[0])
        const lng = Number(entry.position?.[1])
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
        pts.push({ lat, lng })
      }

      if (pts.length === 0) continue

      const trail =
        pts.length > maxTrailPoints ? pts.slice(-maxTrailPoints) : pts
      const latest = trail[trail.length - 1]
      const ts = latestTsById.get(id) ?? 0

      out.push({ id, ts, latest, trail })
    }

    out.sort((a, b) => b.ts - a.ts)
    return out
  }, [alerts, maxTrailPoints])

  return (
    <>
      {incidents.map((inc) => (
        <span key={`wrong-way-${inc.id}`}>
          {/* trail as solid small dots */}
          {inc.trail.map((p, i) => (
            <CircleMarker
              key={`wrong-way-${inc.id}-dot-${i}`}
              center={[p.lat, p.lng]}
              radius={3}
              pathOptions={{
                color: 'red',
                fillColor: 'red',
                fillOpacity: 1,
                opacity: 1,
                weight: 0,
              }}
            />
          ))}

          {/* head marker (slightly larger) */}
          <CircleMarker
            center={[inc.latest.lat, inc.latest.lng]}
            radius={17}
            pathOptions={{
              color: 'red',
              fillColor: 'red',
              fillOpacity: 0.6,
              opacity: 1,
              weight: 0,
            }}
            className="alert-pulse"
          />
        </span>
      ))}

      <style jsx global>{`
        .alert-pulse {
          transform-box: fill-box;
          transform-origin: center;
          animation: alert-pulse 0.6s linear infinite;
        }
        @keyframes alert-pulse {
          0% {
            transform: scale(0.85);
            opacity: 1;
          }
          70% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(0.85);
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}
