import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, Polyline } from 'react-leaflet'

export type SourcePayload = Record<string, unknown>

export type AlertPayload = {
  id: number
  code: number
  message: string
  locationIdentifier: string
  url?: string | null
  tenantId?: string
  timestampUtc: string
  severity: string | number
  category?: string | null
  sourcePayload?: SourcePayload | null
  type?: string | null
}

type LatLng = { lat: number; lng: number }

type RenderItem = {
  id: number
  lastUpdated: number
  cur: LatLng
  trail: LatLng[] // oldest -> newest
}

const MAX_IDS = 20

const MARKER_TTL_MS = 1_000 // or whatever you want

function isLatLng(x: unknown): x is [number, number] {
  return (
    Array.isArray(x) &&
    x.length >= 2 &&
    typeof x[0] === 'number' &&
    typeof x[1] === 'number'
  )
}

// Tries to read position from your parsed sourcePayload:
// - sourcePayload.log[0].position = [lat,lng,...]
// - sourcePayload.position = [lat,lng,...] (fallback)
function getAlertLatLng(a: AlertPayload): LatLng | null {
  const sp = a.sourcePayload as any
  const pos =
    sp?.log?.[0]?.position ?? sp?.position ?? sp?.log?.at?.(-1)?.position // in case log grows

  if (!isLatLng(pos)) return null
  return { lat: pos[0], lng: pos[1] }
}

export function WrongWayMarker({ alerts }: { alerts: AlertPayload[] }) {
  // Map of id -> item (kept in a ref so updates are cheap)
  const itemsRef = useRef<Map<number, RenderItem>>(new Map())
  // We keep a small "revision" state so React re-renders when we mutate the ref
  const [rev, setRev] = useState(0)

  useEffect(() => {
    if (!alerts?.length) return

    let changed = false
    const now = Date.now()
    const map = itemsRef.current

    for (const a of alerts) {
      // only plot alerts that actually have a position
      const ll = getAlertLatLng(a)
      if (!ll) continue

      const id = a.id
      const existing = map.get(id)

      if (!existing) {
        // new id -> add
        map.set(id, {
          id,
          lastUpdated: now,
          cur: ll,
          trail: [ll],
        })
        changed = true
      } else {
        // existing id -> "create a new one" (update current point)
        // and draw a line to the old point (trail)
        const prev = existing.cur
        // if it actually moved, append; otherwise just bump timestamp
        const moved = prev.lat !== ll.lat || prev.lng !== ll.lng

        if (moved) {
          const nextTrail = [...existing.trail, ll]
          map.set(id, {
            ...existing,
            lastUpdated: now,
            cur: ll,
            trail: nextTrail,
          })
          changed = true
        } else if (existing.lastUpdated !== now) {
          map.set(id, { ...existing, lastUpdated: now })
          changed = true
        }
      }
    }

    // Enforce MAX_IDS (evict the *oldest* marker by lastUpdated)
    if (map.size > MAX_IDS) {
      const sortedOldestFirst = Array.from(map.values()).sort(
        (a, b) => a.lastUpdated - b.lastUpdated
      )
      const toRemove = map.size - MAX_IDS
      for (let i = 0; i < toRemove; i++) {
        map.delete(sortedOldestFirst[i].id)
      }
      changed = true
    }

    if (changed) setRev((r) => r + 1)
  }, [alerts])

  // Snapshot for rendering (derived from the ref)
  const items = useMemo(() => {
    // rev is used to recalc when we mutate itemsRef
    void rev
    return Array.from(itemsRef.current.values())
  }, [rev])

  useEffect(() => {
    const t = window.setInterval(() => {
      const now = Date.now()
      const map = itemsRef.current
      let changed = false

      for (const [id, item] of map.entries()) {
        if (now - item.lastUpdated > MARKER_TTL_MS) {
          map.delete(id)
          changed = true
        }
      }

      if (changed) setRev((r) => r + 1)
    }, 200)

    return () => window.clearInterval(t)
  }, [])

  return (
    <>
      {items.map((inc) => (
        <span key={`wrong-way-${inc.id}`}>
          {inc.trail.length >= 2 && (
            <Polyline
              positions={inc.trail.map(
                (p) => [p.lat, p.lng] as [number, number]
              )}
              pathOptions={{
                color: 'red',
                weight: 2,
                opacity: 0.8,
              }}
            />
          )}

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
    </>
  )
}
