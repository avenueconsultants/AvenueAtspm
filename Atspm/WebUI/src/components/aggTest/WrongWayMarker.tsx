import { AlertPayload } from '@/components/aggTest/hooks/useAlertsHub'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, Polyline } from 'react-leaflet'

export type SourcePayload = Record<string, unknown>

type LatLng = { lat: number; lng: number }

type RenderItem = {
  id: number
  lastUpdated: number
  cur: LatLng
  trail: LatLng[]
  pulse: boolean
}

function isLatLng(x: unknown) {
  return (
    Array.isArray(x) &&
    x.length >= 2 &&
    typeof x[0] === 'number' &&
    typeof x[1] === 'number'
  )
}

function getAlertLatLng(a: AlertPayload): LatLng | null {
  const sp = a.sourcePayload as any
  const pos =
    sp?.log?.[0]?.position ?? sp?.position ?? sp?.log?.at?.(-1)?.position

  if (!isLatLng(pos)) return null
  return { lat: pos[0], lng: pos[1] }
}

function isSev10(severity: AlertPayload['severity']) {
  if (typeof severity === 'number') return severity === 10
  if (typeof severity === 'string') return Number(severity) === 10
  return false
}

export function WrongWayMarker({ alerts }: { alerts: AlertPayload[] }) {
  const itemsRef = useRef<Map<number, RenderItem>>(new Map())
  const [rev, setRev] = useState(0)

  useEffect(() => {
    const now = Date.now()
    const map = itemsRef.current
    let changed = false

    const nextIds = new Set<number>()

    for (const a of alerts ?? []) {
      const ll = getAlertLatLng(a)
      if (!ll) continue

      const id = a.id
      nextIds.add(id)

      const pulse = isSev10(a.severity)
      const existing = map.get(id)

      if (!existing) {
        map.set(id, { id, lastUpdated: now, cur: ll, trail: [ll], pulse })
        changed = true
        continue
      }

      const prev = existing.cur
      const moved = prev.lat !== ll.lat || prev.lng !== ll.lng
      const pulseChanged = existing.pulse !== pulse

      if (moved) {
        map.set(id, {
          ...existing,
          lastUpdated: now,
          cur: ll,
          trail: [...existing.trail, ll],
          pulse,
        })
        changed = true
      } else if (existing.lastUpdated !== now || pulseChanged) {
        map.set(id, { ...existing, lastUpdated: now, pulse })
        changed = true
      }
    }

    for (const id of map.keys()) {
      if (!nextIds.has(id)) {
        map.delete(id)
        changed = true
      }
    }

    if (changed) setRev((r) => r + 1)
  }, [alerts])

  const items = useMemo(() => {
    void rev
    return Array.from(itemsRef.current.values())
  }, [rev])

  return (
    <>
      {items.map((inc) => (
        <span key={`wrong-way-${inc.id}`}>
          {inc.trail.length >= 2 && (
            <Polyline
              positions={inc.trail.map(
                (p) => [p.lat, p.lng] as [number, number]
              )}
              pathOptions={{ color: 'red', weight: 2, opacity: 0.8 }}
            />
          )}

          {inc.pulse && (
            <CircleMarker
              center={[inc.cur.lat, inc.cur.lng]}
              radius={26}
              pathOptions={{
                color: 'red',
                fillColor: 'red',
                fillOpacity: 0.18,
                opacity: 0.5,
                weight: 0,
              }}
              className="alert-pulse"
            />
          )}

          {/* head marker */}
          <CircleMarker
            center={[inc.cur.lat, inc.cur.lng]}
            radius={5}
            pathOptions={{
              color: 'red',
              fillColor: 'red',
              fillOpacity: 1,
              opacity: 1,
              weight: 1,
            }}
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
            transform: scale(
              0.8
            ); /* slightly smaller start since ring is bigger */
            opacity: 1;
          }
          70% {
            transform: scale(1.08); /* gentle expansion */
            opacity: 1;
          }
          100% {
            transform: scale(0.8);
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}
