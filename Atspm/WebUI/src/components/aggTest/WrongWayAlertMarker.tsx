import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker } from 'react-leaflet'

// keep your existing type import if you want; this version only needs these fields
export type WrongWayAlertLite = {
  id: number
  type: string
  // latest position for this id (whatever you have now)
  position?: [number, number, number?] | [number, number] | null
  // optional timestamp (ms). if omitted we’ll just use Date.now()
  timestamp?: number | null
}

type LatLng = { lat: number; lng: number }

type RenderItem = {
  id: number
  ts: number
  from: LatLng
  to: LatLng
}

function toLatLng(
  pos?: [number, number, number?] | [number, number] | number[] | null
): LatLng | null {
  const lat = Number(pos?.[0])
  const lng = Number(pos?.[1])
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

export function WrongWayAlertMarker({
  alerts,
  ttlMs = 50_000,
  animateMs = 650,
}: {
  // now expects latest-point alerts, not log/trail
  alerts: WrongWayAlertLite[]
  ttlMs?: number
  animateMs?: number
}) {
  console.log('WA:', alerts)
  // last known position per id (persists across renders)
  const prevByIdRef = useRef<Map<number, LatLng>>(new Map())

  // per-id animation state (from -> to + startedAt)
  const animRef = useRef<
    Map<number, { from: LatLng; to: LatLng; startedAt: number; ts: number }>
  >(new Map())

  // tick for animation + TTL expiration even without new alerts
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 50)
    return () => window.clearInterval(id)
  }, [])

  // ingest latest points: build/refresh animations
  useEffect(() => {
    const prevById = prevByIdRef.current
    const animById = animRef.current

    for (const a of alerts ?? []) {
      if (!a || a.type !== 'object.wrong-way') continue
      const to = toLatLng(a.position ?? null)
      if (!to) continue

      const ts = Number.isFinite(a.timestamp as any)
        ? Number(a.timestamp)
        : Date.now()

      // if you want TTL based on "ts", keep it; otherwise use Date.now()
      const from = prevById.get(a.id) ?? to

      // if position didn't change, just refresh timestamp
      if (from.lat === to.lat && from.lng === to.lng) {
        const existing = animById.get(a.id)
        if (existing) existing.ts = ts
        else animById.set(a.id, { from, to, startedAt: now, ts })
        prevById.set(a.id, to)
        continue
      }

      animById.set(a.id, { from, to, startedAt: now, ts })
      prevById.set(a.id, to)
    }
  }, [alerts, now])

  const items = useMemo((): RenderItem[] => {
    const animById = animRef.current

    // expire old markers
    for (const [id, st] of animById.entries()) {
      if (now - (st.ts ?? 0) > ttlMs) animById.delete(id)
    }

    const out: RenderItem[] = []
    for (const [id, st] of animById.entries()) {
      // compute interpolated position
      const tRaw = animateMs <= 0 ? 1 : (now - st.startedAt) / animateMs
      const t = tRaw >= 1 ? 1 : tRaw <= 0 ? 0 : easeOutCubic(tRaw)

      const cur: LatLng =
        t >= 1
          ? st.to
          : {
              lat: lerp(st.from.lat, st.to.lat, t),
              lng: lerp(st.from.lng, st.to.lng, t),
            }

      // once finished, lock the animation "from" to "to" so it stays stable
      if (t >= 1) {
        st.from = st.to
        st.startedAt = now
      }

      out.push({ id, ts: st.ts, from: cur, to: st.to })
    }

    out.sort((a, b) => b.ts - a.ts)
    return out
  }, [now, ttlMs, animateMs])

  console.log('B:', items)

  return (
    <>
      {items.map((inc) => (
        <span key={`wrong-way-${inc.id}`}>
          {/* head marker only (no log/trail) */}
          <CircleMarker
            center={[inc.from.lat, inc.from.lng]}
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
