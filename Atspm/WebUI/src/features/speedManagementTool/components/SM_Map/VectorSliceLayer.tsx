import { getRouteColor } from '@/features/speedManagementTool/components/SM_Map/SM_Legend'
import { RouteRenderOption } from '@/features/speedManagementTool/enums'
import useSpeedManagementStore from '@/features/speedManagementTool/speedManagementStore'
import type { SpeedManagementRoute } from '@/features/speedManagementTool/types/routes'
import { ViolationColors } from '@/features/speedManagementTool/utils/colors'
import { lineString } from '@turf/helpers'
import lineOffset from '@turf/line-offset'
import L from 'leaflet'
import 'leaflet.vectorgrid'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMap } from 'react-leaflet'

type Props = {
  routes: SpeedManagementRoute[]
  selectedRouteIds: string[]
  setSelectedRouteId: (routeId: string) => void
  setHoveredSegment: (route: SpeedManagementRoute | null) => void
}

const getPolylineWeight = (zoom: number) => {
  if (zoom >= 18) return 10
  if (zoom >= 15) return 4
  if (zoom >= 12) return 3
  if (zoom >= 10) return 1.5
  if (zoom >= 8) return 1.5
  return 1
}

function colorFromProps(
  p: any,
  opt: RouteRenderOption,
  mediumMin: number,
  mediumMax: number
) {
  if (opt === RouteRenderOption.Violations) {
    const v = p?.violations ?? null
    if (v === null) return '#000'
    if (v <= mediumMin) return ViolationColors.Low
    if (v < mediumMax) return ViolationColors.Medium
    return ViolationColors.High
  }
  const v =
    opt === RouteRenderOption.Posted_Speed
      ? (p?.Speed_Limit ?? null)
      : opt === RouteRenderOption.Percentile_85th
        ? (p?.averageEightyFifthSpeed ?? null)
        : (p?.averageSpeed ?? null)
  if (v === null) return '#000'
  return getRouteColor(v)
}

const hasDir = (s: string | undefined, dir: 'nb' | 'sb' | 'eb' | 'wb') => {
  return !!s && s.toLowerCase().includes(dir)
}

const offsetMetersForZoom = (z: number) => {
  if (z >= 14) return 10
  if (z >= 13) return 30
  if (z >= 12) return 70
  if (z >= 10) return 100
  if (z >= 8) return 0
  return 0
}

const dirSignedOffset = (name?: string, z = 12) => {
  const m = offsetMetersForZoom(z)
  if (!m) return 0
  if (hasDir(name, 'nb') || hasDir(name, 'eb')) return +m
  if (hasDir(name, 'sb') || hasDir(name, 'wb')) return -m
  return 0
}

// --- minimal validation helpers (NEW) ---
const isNum = (n: any) => Number.isFinite(n)
const isPt = (p: any) =>
  Array.isArray(p) && p.length >= 2 && isNum(p[0]) && isNum(p[1])
const cleanLine = (line: any): number[][] =>
  Array.isArray(line) ? line.filter(isPt) : []
const cleanMulti = (multi: any): number[][][] =>
  Array.isArray(multi)
    ? multi
        .map((part: any) => cleanLine(part))
        .filter((part: number[][]) => part.length >= 2)
    : []

// normalize to [lng,lat]
const isLatLng = (c: number[]) => Math.abs(c[0]) <= 90 && Math.abs(c[1]) <= 180
const swap = (c: number[]) => [c[1], c[0]]
const normalizeLine = (coords: number[][]) =>
  coords.map((c) => (isLatLng(c) ? swap(c) : c))

export default function VectorRoutesSlicerLayer({
  routes,
  selectedRouteIds,
  setSelectedRouteId,
  setHoveredSegment,
}: Props) {
  const map = useMap()
  const layerRef = useRef<L.VectorGrid>(null)
  const [zoom, setZoom] = useState(map.getZoom())

  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom())
    map.on('zoomend', onZoom)
    return () => map.off('zoomend', onZoom)
  }, [map])

  // Build FeatureCollection with per-feature offset based on name + zoom
  const featureCollection = useMemo(() => {
    const feats = routes
      .map((f) => {
        const name = f?.properties?.name as string | undefined
        const meters = dirSignedOffset(name, zoom)

        // base geometry in [lng,lat]
        const baseCoords =
          f.geometry.type === 'LineString'
            ? normalizeLine(f.geometry.coordinates as any)
            : f.geometry.type === 'MultiLineString'
              ? (f.geometry.coordinates as any).map(normalizeLine)
              : null

        if (!baseCoords) return null // not a line

        if (meters === 0) {
          // just clean & return
          if (f.geometry.type === 'LineString') {
            const coords = cleanLine(baseCoords as number[][])
            return coords.length >= 2
              ? { ...f, geometry: { type: 'LineString', coordinates: coords } }
              : null
          } else {
            const parts = cleanMulti(baseCoords as number[][][])
            return parts.length
              ? {
                  ...f,
                  geometry: { type: 'MultiLineString', coordinates: parts },
                }
              : null
          }
        }

        // apply turf offset (meters) — handle types separately, with cleaning
        if (f.geometry.type === 'LineString') {
          let coords = cleanLine(baseCoords as number[][])
          if (coords.length < 2) return null
          try {
            const off = lineOffset(
              lineString(coords as any, f.properties),
              meters,
              { units: 'meters' }
            )
            coords = cleanLine(off.geometry.coordinates as any)
          } catch {
            return null
          }
          return coords.length >= 2
            ? { ...f, geometry: { type: 'LineString', coordinates: coords } }
            : null
        } else {
          // MultiLineString: offset each part, drop bad ones
          let parts = cleanMulti(baseCoords as number[][][])
          if (!parts.length) return null
          try {
            parts = parts
              .map((part) => {
                const off = lineOffset(
                  lineString(part as any, f.properties),
                  meters,
                  { units: 'meters' }
                )
                return cleanLine(off.geometry.coordinates as any)
              })
              .filter((p) => p.length >= 2)
          } catch {
            return null
          }
          return parts.length
            ? {
                ...f,
                geometry: { type: 'MultiLineString', coordinates: parts },
              }
            : null
        }
      })
      .filter(Boolean) as any[]

    return { type: 'FeatureCollection', features: feats } as const
  }, [routes, zoom])

  const { routeRenderOption, mediumMin, mediumMax } = useSpeedManagementStore()

  const styleFn = useMemo(
    () => (props: any, z: number) => ({
      color: colorFromProps(props, routeRenderOption, mediumMin, mediumMax),
      weight: getPolylineWeight(z),
      opacity: 1,
      lineCap: 'round',
    }),
    [routeRenderOption, mediumMin, mediumMax]
  )

  useEffect(() => {
    if (!featureCollection.features?.length) return

    if (layerRef.current) {
      map.removeLayer(layerRef.current)
      layerRef.current = null
    }

    const vg = (L as any).vectorGrid.slicer(featureCollection, {
      maxZoom: 22,
      indexMaxZoom: 14,
      indexMaxPoints: 100000,
      tolerance: 3,
      interactive: true,
      vectorTileLayerStyles: { sliced: styleFn },
      getFeatureId: (f: any) => f.properties.route_id,
    })

    vg.on('click', (e: any) => {
      const id = e.layer?.properties?.route_id
      if (id) setSelectedRouteId(id)
    })

    vg.on('mouseover', (e: any) => {
      const p = e.layer?.properties
      if (!p) return
      setHoveredSegment({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [] },
        properties: {
          route_id: p.route_id,
          name: p.name,
          speedLimit: p.speedLimit || p.Speed_Limit,
          averageSpeed: p.averageSpeed,
          averageEightyFifthSpeed: p.averageEightyFifthSpeed,
          violations: p.violations,
        },
      } as unknown as SpeedManagementRoute)

      const id = p.route_id
      if (id) {
        const z = map.getZoom()
        const w = z >= 18 ? 10 : z >= 15 ? 5 : z >= 12 ? 4 : z >= 10 ? 3 : 2
        vg.setFeatureStyle(id, (pp: any, z: number) => ({
          ...styleFn(pp, z),
          color: 'blue',
          weight: w,
        }))
      }
    })

    vg.on('mouseout', (e: any) => {
      setHoveredSegment(null)
      const id = e.layer?.properties?.route_id
      if (id) vg.resetFeatureStyle(id)
    })

    vg.addTo(map)
    layerRef.current = vg

    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current)
      layerRef.current = null
    }
  }, [map, featureCollection, styleFn, setHoveredSegment])

  useEffect(() => {
    const vg = layerRef.current
    if (!vg) return
    selectedRouteIds.forEach((id) => {
      vg.setFeatureStyle(id, (pp: any, z: number) => ({
        ...styleFn(pp, z),
        color: 'blue',
        weight: getPolylineWeight(z) + 3,
      }))
    })
  }, [selectedRouteIds, styleFn])

  return null
}
