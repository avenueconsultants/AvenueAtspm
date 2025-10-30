// components/ApproachVolumesLayer.tsx
import { useMemo } from 'react'
import { Polyline } from 'react-leaflet'

type Dir = 'Northbound' | 'Southbound' | 'Eastbound' | 'Westbound'
type Loc = { id: string; lat: number; lng: number }
type DirVolumes = Record<string, Partial<Record<Dir, number>>>
type RoadSeg = { coordinates: [number, number][] | [number, number][][] }

const FT = 0.3048
const stubLenM = 50 * FT
const bearingMap: Record<Dir, number> = {
  Northbound: 0,
  Eastbound: 90,
  Southbound: 180,
  Westbound: 270,
}

function colorFor(v: number) {
  const x = Math.max(0, Math.min(1000, v)) / 1000
  const h = (1 - x) * 120
  return `hsl(${h} 90% 45%)`
}

export default function ApproachVolumesLayer({
  locations,
  dirVolumes,
  roadsByLocation,
}: {
  locations: Loc[]
  dirVolumes: DirVolumes
  roadsByLocation: Record<string, RoadSeg[]>
}) {
  const lines = useMemo(() => {
    const out: {
      key: string
      positions: [number, number][]
      color: string
      weight: number
    }[] = []
    for (const loc of locations) {
      const vols = dirVolumes[loc.id]
      if (!vols) continue
      const rawSegs = roadsByLocation[loc.id] ?? []
      const segs = normalizeSegs(rawSegs)
      for (const d of [
        'Northbound',
        'Southbound',
        'Eastbound',
        'Westbound',
      ] as Dir[]) {
        const v = vols[d]
        if (v == null) continue
        const path = roadStub(segs, [loc.lat, loc.lng], bearingMap[d], stubLenM)
        if (!path || path.length < 2) continue
        out.push({
          key: `${loc.id}:${d}`,
          positions: path,
          color: colorFor(v),
          weight: Math.max(
            2,
            Math.min(8, 2 + Math.log10(Math.max(1, v + 1)) * 2)
          ),
        })
      }
    }
    return out
  }, [locations, dirVolumes, roadsByLocation])

  return (
    <>
      {lines.map((l) => (
        <Polyline
          key={l.key}
          positions={l.positions}
          pathOptions={{ color: l.color, weight: l.weight, opacity: 0.95 }}
        />
      ))}
    </>
  )
}

function normalizeSegs(segs: RoadSeg[]): [number, number][][] {
  const out: [number, number][][] = []
  for (const s of segs) {
    const g = s.coordinates as any
    if (!g) continue
    if (Array.isArray(g[0][0])) out.push(...(g as [number, number][][]))
    else out.push(g as [number, number][])
  }
  return out
}

function roadStub(
  segments: [number, number][][],
  origin: [number, number],
  targetBearing: number,
  meters: number
) {
  if (!segments.length) return null
  let best: {
    seg: [number, number][]
    i: number
    t: number
    bearing: number
    score: number
  } | null = null
  for (const seg of segments) {
    if (seg.length < 2) continue
    const c = closestOnPolyline(seg, origin)
    if (!c) continue
    const br = segmentBearing(seg[c.i], seg[c.i + 1])
    const score = angularDiff(br, targetBearing) + c.distM * 0.001
    if (!best || score < best.score)
      best = { seg, i: c.i, t: c.t, bearing: br, score }
  }
  if (!best) return null
  const forward = angularDiff(best.bearing, targetBearing) <= 90
  return walkAlong(best.seg, best.i, best.t, origin, forward, meters)
}

function closestOnPolyline(seg: [number, number][], latlng: [number, number]) {
  let best: { i: number; t: number; distM: number } | null = null
  for (let i = 0; i < seg.length - 1; i++) {
    const a = seg[i],
      b = seg[i + 1]
    const proj = projectPointOnSegmentMeters(a, b, latlng)
    if (!best || proj.distM < best.distM)
      best = { i, t: proj.t, distM: proj.distM }
  }
  return best
}

function walkAlong(
  seg: [number, number][],
  i: number,
  t: number,
  startLL: [number, number],
  forward: boolean,
  meters: number
) {
  const path: [number, number][] = [startLL]
  let remaining = meters
  let idx = i
  let a = seg[idx],
    b = seg[idx + 1]
  ;({ a, b, t } = clampToSegment(a, b, t, forward))
  let cur = interpLL(a, b, t)
  while (remaining > 0) {
    const next = forward
      ? idx + 1 < seg.length - 1
        ? seg[idx + 1]
        : null
      : idx > 0
        ? seg[idx]
        : null
    const end = forward ? b : a
    const d = haversine(cur[0], cur[1], end[1], end[0])
    if (d >= remaining) {
      const ratio = remaining / d
      const dest = interpLL([cur[1], cur[0]], end, ratio)
      path.push([dest[1], dest[0]])
      break
    } else {
      path.push([end[1], end[0]])
      remaining -= d
      if (!next) break
      if (forward) {
        idx++
        a = b
        b = next
      } else {
        idx--
        b = a
        a = next
      }
      cur = [end[1], end[0]]
    }
  }
  return path
}

function clampToSegment(
  a: [number, number],
  b: [number, number],
  t: number,
  forward: boolean
) {
  if (t < 0) return { a, b, t: forward ? 0 : 1 }
  if (t > 1) return { a, b, t: forward ? 1 : 0 }
  return { a, b, t }
}

function projectPointOnSegmentMeters(
  a: [number, number],
  b: [number, number],
  p: [number, number]
) {
  const lat0 = (p[0] * Math.PI) / 180
  const toXY = (ll: [number, number]) => {
    const x = (ll[1] - p[1]) * Math.cos(lat0) * 111320
    const y = (ll[0] - p[0]) * 110540
    return [x, y] as [number, number]
  }
  const A = toXY([a[1], a[0]]),
    B = toXY([b[1], b[0]]),
    P = [0, 0] as [number, number]
  const ABx = B[0] - A[0],
    ABy = B[1] - A[1]
  const ab2 = ABx * ABx + ABy * ABy || 1e-9
  let t = ((P[0] - A[0]) * ABx + (P[1] - A[1]) * ABy) / ab2
  t = Math.max(0, Math.min(1, t))
  const Qx = A[0] + ABx * t,
    Qy = A[1] + ABy * t
  const dx = P[0] - Qx,
    dy = P[1] - Qy
  const distM = Math.hypot(dx, dy)
  return { t, distM }
}

function segmentBearing(a: [number, number], b: [number, number]) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const φ1 = toRad(a[1]),
    φ2 = toRad(b[1]),
    λ1 = toRad(a[0]),
    λ2 = toRad(b[0])
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2)
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

function interpLL(a: [number, number], b: [number, number], t: number) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as [
    number,
    number,
  ]
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dφ = toRad(lat2 - lat1),
    dλ = toRad(lon2 - lon1)
  const φ1 = toRad(lat1),
    φ2 = toRad(lat2)
  const a =
    Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function angularDiff(a: number, b: number) {
  let d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}
