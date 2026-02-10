import {
  UiAlert,
  WrongWayVehicleAlertBroadcastDto,
} from '@/components/aggTest/hooks/types'
import { Color } from '@/features/charts/utils'
import { createPinWithIcon } from '@/features/locations/utils'
import DangerousIcon from '@mui/icons-material/Dangerous'
import type L from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import { Marker, Polygon, Polyline } from 'react-leaflet'

type LatLng = { lat: number; lng: number }

type RenderItem = {
  id: string
  head: LatLng
  trail: LatLng[]
  pulse: boolean
  speedMps?: number
  bearingDeg?: number
}

function isLatLng(x: unknown) {
  return (
    Array.isArray(x) &&
    x.length >= 2 &&
    typeof x[0] === 'number' &&
    typeof x[1] === 'number'
  )
}

function getAlertLatLng(a: UiAlert): LatLng | null {
  const p = a.payload as Partial<WrongWayVehicleAlertBroadcastDto> & any

  const logs: any[] = Array.isArray(p?.trackingLogs) ? p.trackingLogs : []
  const last = logs.length ? logs[logs.length - 1] : null

  // 1) last.position
  if (isLatLng(last?.position))
    return { lat: last.position[0], lng: last.position[1] }

  // 2) last.latitude/longitude
  if (
    typeof last?.latitude === 'number' &&
    typeof last?.longitude === 'number'
  ) {
    return { lat: last.latitude, lng: last.longitude }
  }

  // 3) top-level position
  if (isLatLng(p?.position)) return { lat: p.position[0], lng: p.position[1] }

  // 4) top-level latitude/longitude
  if (typeof p?.latitude === 'number' && typeof p?.longitude === 'number') {
    return { lat: p.latitude, lng: p.longitude }
  }

  // 5) object lat/lng (last resort)
  if (
    typeof p?.object?.latitude === 'number' &&
    typeof p?.object?.longitude === 'number'
  ) {
    return { lat: p.object.latitude, lng: p.object.longitude }
  }

  return null
}

function isSev10(severity: UiAlert['severity']) {
  if (typeof severity === 'number') return severity === 10
  if (typeof severity === 'string') return Number(severity) === 10
  return false
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function degToRad(d: number) {
  return (d * Math.PI) / 180
}

function addMeters(
  origin: LatLng,
  northMeters: number,
  eastMeters: number
): LatLng {
  const latRad = degToRad(origin.lat)
  const metersPerDegLat = 111_320
  const metersPerDegLng = Math.cos(latRad) * 111_320

  return {
    lat: origin.lat + northMeters / metersPerDegLat,
    lng: origin.lng + eastMeters / metersPerDegLng,
  }
}

function normalizeDeg(d: number) {
  const x = d % 360
  return x < 0 ? x + 360 : x
}

function bearingToUnitNE(bearingDeg: number) {
  const br = degToRad(normalizeDeg(bearingDeg))
  // 0=N, 90=E
  return { n: Math.cos(br), e: Math.sin(br) }
}

function buildConePolygon(args: {
  origin: LatLng
  bearingDeg: number
  speedMps: number
  coneHalfAngleDeg?: number
  secondsAhead?: number
  minMeters?: number
  maxMeters?: number
  arcSteps?: number
}): LatLng[] {
  const {
    origin,
    bearingDeg,
    speedMps,
    coneHalfAngleDeg = 18,
    secondsAhead = 3,
    minMeters = 100,
    maxMeters = 500,
    arcSteps = 24,
  } = args

  const dist = clamp(speedMps * secondsAhead, minMeters, maxMeters)

  const start = normalizeDeg(bearingDeg - coneHalfAngleDeg)
  const end = normalizeDeg(bearingDeg + coneHalfAngleDeg)

  const span = (() => {
    const raw = end - start
    return raw >= 0 ? raw : raw + 360
  })()

  const pts: LatLng[] = [origin]

  for (let i = 0; i <= arcSteps; i++) {
    const t = i / arcSteps
    const ang = normalizeDeg(start + span * t)
    const u = bearingToUnitNE(ang)
    pts.push(addMeters(origin, u.n * dist, u.e * dist))
  }

  return pts
}

function getSpeedAndBearing(a: UiAlert): {
  speedMps?: number
  bearingDeg?: number
} {
  const p = a.payload as Partial<WrongWayVehicleAlertBroadcastDto> & any
  const logs: any[] = Array.isArray(p?.trackingLogs) ? p.trackingLogs : []
  const last = logs.length ? logs[logs.length - 1] : null

  const speed =
    last?.speedMps ??
    last?.speed ??
    p?.speedMps ??
    p?.speed ??
    p?.object?.speedMps ??
    p?.object?.speed

  const bearing =
    last?.bearingDeg ??
    last?.bearing ??
    last?.headingDeg ??
    p?.bearingDeg ??
    p?.bearing ??
    p?.headingDeg

  return {
    speedMps: typeof speed === 'number' ? speed : undefined,
    bearingDeg: typeof bearing === 'number' ? bearing : undefined,
  }
}

function dedupeConsecutive(xs: LatLng[]) {
  const out: LatLng[] = []
  for (const p of xs) {
    const last = out[out.length - 1]
    if (!last || last.lat !== p.lat || last.lng !== p.lng) out.push(p)
  }
  return out
}

let wrongWayIconCached: Promise<L.DivIcon> | null = null
function getWrongWayPinIcon(): Promise<L.DivIcon> {
  if (!wrongWayIconCached) {
    wrongWayIconCached = createPinWithIcon({
      color: Color.BrightRed,
      MuiIcon: DangerousIcon,
      iconSize: 18,
      offset: 0,
      scale: 0.85,
    })
  }
  return wrongWayIconCached
}

export function WrongWayMarker({ alerts }: { alerts: UiAlert[] }) {
  const items = useMemo<RenderItem[]>(() => {
    const groups = new Map<string, UiAlert[]>()

    for (const a of alerts ?? []) {
      const id = a.id
      if (!id) continue
      const arr = groups.get(id)
      if (arr) arr.push(a)
      else groups.set(id, [a])
    }

    const out: RenderItem[] = []

    for (const [id, evts] of groups.entries()) {
      evts.sort(
        (a, b) => Date.parse(a.timestampUtc) - Date.parse(b.timestampUtc)
      )

      const trail = dedupeConsecutive(
        evts.map(getAlertLatLng).filter((x): x is LatLng => !!x)
      )

      if (!trail.length) continue

      const lastEvt = evts[evts.length - 1]
      const { speedMps, bearingDeg } = getSpeedAndBearing(lastEvt)

      out.push({
        id,
        head: trail[trail.length - 1],
        trail,
        pulse: isSev10(lastEvt.severity),
        speedMps,
        bearingDeg,
      })
    }

    // newest head on top
    out.sort((a, b) => b.trail.length - a.trail.length)
    return out
  }, [alerts])

  const [icon, setIcon] = useState<L.DivIcon | null>(null)

  useEffect(() => {
    let mounted = true
    getWrongWayPinIcon().then((i) => mounted && setIcon(i))
    return () => {
      mounted = false
    }
  }, [])

  if (!icon) return null

  return (
    <>
      {items.map((inc) => {
        const headKey = `${inc.id}|${inc.head.lat.toFixed(6)}|${inc.head.lng.toFixed(6)}`

        const cone =
          typeof inc.speedMps === 'number' &&
          Number.isFinite(inc.speedMps) &&
          typeof inc.bearingDeg === 'number' &&
          Number.isFinite(inc.bearingDeg)
            ? buildConePolygon({
                origin: inc.head,
                bearingDeg: inc.bearingDeg,
                speedMps: inc.speedMps,
                secondsAhead: 1000,
                coneHalfAngleDeg: 50,
              })
            : null

        return (
          <span key={`wrong-way-${inc.id}`}>
            {inc.trail.length >= 2 && (
              <Polyline
                positions={inc.trail.map(
                  (p) => [p.lat, p.lng] as [number, number]
                )}
                pathOptions={{ color: 'red', weight: 2, opacity: 0.8 }}
              />
            )}

            {cone && (
              <Polygon
                key={`cone-${headKey}`}
                positions={cone.map((p) => [p.lat, p.lng] as [number, number])}
                pathOptions={{
                  color: 'darkorange',
                  weight: 1,
                  opacity: 0.5,
                  fillColor: 'darkorange',
                  fillOpacity: 0.5,
                }}
              />
            )}

            {/* Keep glow/pulse styling (now applied to the Marker icon wrapper) */}
            <Marker
              key={`head-${headKey}`}
              position={[inc.head.lat, inc.head.lng]}
              icon={icon}
              // Leaflet will apply this to the <img>/<div> element for the icon.
              // Keep it stable so your CSS animation/glow targets the same class.
              className={inc.pulse ? 'alert-pulse' : undefined}
              zIndexOffset={inc.pulse ? 1000 : 0}
            />
          </span>
        )
      })}

      <style jsx global>{`
        .alert-pulse {
          transform-box: fill-box;
          transform-origin: center;
          animation: alert-pulse 0.6s linear infinite;
          filter: drop-shadow(0 0 10px rgba(255, 0, 0, 0.9))
            drop-shadow(0 0 18px rgba(255, 0, 0, 0.55));
        }
        @keyframes alert-pulse {
          0% {
            transform: scale(0.92);
            opacity: 1;
          }
          70% {
            transform: scale(1.08);
            opacity: 1;
          }
          100% {
            transform: scale(0.92);
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}
