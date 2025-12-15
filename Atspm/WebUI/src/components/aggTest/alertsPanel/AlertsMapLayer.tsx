// components/aggTest/AlertsMapLayer.tsx
import { WrongWayAlertMarker } from '@/components/aggTest/WrongWayAlertMarker'
import { useAlertPins } from '@/components/aggTest/useAlertPins'
import type {
  AlertEvent,
  IllegalMovementAlert,
  NearMissAlert,
  RedLightAlert,
  WrongWayAlert,
} from '@/components/aggTest/useAlertsHubMock'
import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, Marker } from 'react-leaflet'

type LatLng = { lat: number; lng: number }

function isWrongWay(a: AlertEvent): a is WrongWayAlert {
  return a.type === 'object.wrong-way'
}
function isIllegal(a: AlertEvent): a is IllegalMovementAlert {
  return a.type === 'intersection.illegal-movement'
}
function isNearMiss(a: AlertEvent): a is NearMissAlert {
  return a.type === 'intersection.near-miss'
}
function isRedLight(a: AlertEvent): a is RedLightAlert {
  return a.type === 'intersection.red-light'
}

function toLatLng(
  pos?: [number, number, number] | number[] | null
): LatLng | null {
  const lat = Number(pos?.[0])
  const lng = Number(pos?.[1])
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

function lerpDots(a: LatLng, b: LatLng, count: number) {
  const pts: LatLng[] = []
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1)
    pts.push({
      lat: a.lat + (b.lat - a.lat) * t,
      lng: a.lng + (b.lng - a.lng) * t,
    })
  }
  return pts
}

export function AlertsMapLayer({
  events,
  ttlMs = 50000, // ✅ configurable
  nearMissDotCount = 10,
}: {
  events: AlertEvent[]
  ttlMs?: number
  nearMissDotCount?: number
}) {
  // tick so items expire even if no new events arrive
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  const { wrongWayLatest, othersLatest, typesToLoad } = useMemo(() => {
    const latestByKey = new Map<string, { e: AlertEvent; ts: number }>()

    for (const e of events ?? []) {
      if (!e || typeof (e as any).id !== 'number') continue
      const key = `${e.type}:${(e as any).id}`

      const ts = isWrongWay(e)
        ? Math.max(...(e.log?.map((x) => x.timestamp) ?? [0]))
        : Number((e as any).timestamp ?? 0)

      const prev = latestByKey.get(key)
      if (!prev || ts > prev.ts) latestByKey.set(key, { e, ts })
    }

    const active = Array.from(latestByKey.values())
      .filter((x) => now - x.ts <= ttlMs)
      .map((x) => x.e)

    const wrongWayLatest = active.filter(isWrongWay)
    const othersLatest = active.filter((x) => !isWrongWay(x))

    // pins needed for currently-visible types
    const typesToLoad = Array.from(new Set(othersLatest.map((x) => x.type)))

    return { wrongWayLatest, othersLatest, typesToLoad }
  }, [events, now, ttlMs])

  const pins = useAlertPins(typesToLoad)

  return (
    <>
      {/* wrong-way keeps your existing trail/pulse, but will vanish after ttlMs due to filtering */}
      <WrongWayAlertMarker alerts={wrongWayLatest} />

      {othersLatest.map((e) => {
        const key = `${e.type}-${(e as any).id}`
        const icon = pins[e.type]
        if (!icon) return null // icons load async

        if (isRedLight(e)) {
          const pos = toLatLng(e.object?.position)
          if (!pos) return null
          return <Marker key={key} position={[pos.lat, pos.lng]} icon={icon} />
        }

        if (isIllegal(e)) {
          const pos = toLatLng(e.object?.position)
          if (!pos) return null
          return <Marker key={key} position={[pos.lat, pos.lng]} icon={icon} />
        }

        if (isNearMiss(e)) {
          const intersect = toLatLng(e.intersect)
          if (!intersect) return null

          const leadingPos = toLatLng(e.leading?.position)
          const trailingPos = toLatLng(e.trailing?.position)

          const dots: LatLng[] = []
          if (leadingPos)
            dots.push(...lerpDots(leadingPos, intersect, nearMissDotCount))
          if (trailingPos)
            dots.push(...lerpDots(trailingPos, intersect, nearMissDotCount))

          return (
            <span key={key}>
              {dots.map((p, i) => (
                <CircleMarker
                  key={`${key}-dot-${i}`}
                  center={[p.lat, p.lng]}
                  radius={3}
                  pathOptions={{
                    color: '#ed6c02',
                    fillColor: '#ed6c02',
                    fillOpacity: 1,
                    opacity: 1,
                    weight: 0,
                  }}
                />
              ))}

              <Marker position={[intersect.lat, intersect.lng]} icon={icon} />
            </span>
          )
        }

        return null
      })}
    </>
  )
}
