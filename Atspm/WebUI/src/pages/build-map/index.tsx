// BuildApproachLegsOnce.tsx
import { useLatestVersionOfAllLocations } from '@/features/locations/api'
import * as turf from '@turf/turf'
import type { Feature, FeatureCollection, LineString } from 'geojson'
import { useEffect } from 'react'

type Dir = 'N' | 'E' | 'S' | 'W'

const ARCGIS_URL =
  'https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/UtahRoads/FeatureServer/0/query'

const MAX_QUERY_DIST_METERS = 80 // how far we search around the signal
const TEST_LIMIT = 3000 // number of locations while testing
const LEG_LENGTH_METERS = 120 // ~200 yards

type RawLocation = {
  LocationIdentifier?: number | string
  id?: number | string
  value?: number | string
  latitude: number
  longitude: number
  [key: string]: any
}

function bearingToDir(bearing: number): Dir {
  // turf.bearing: 0 = N, 90 = E, 180/-180 = S, -90 = W
  if (bearing >= -45 && bearing < 45) return 'N'
  if (bearing >= 45 && bearing < 135) return 'E'
  if (bearing <= -45 && bearing > -135) return 'W'
  return 'S'
}

// trim a polyline to at most maxLenMeters, starting at coords[0]
function trimToLength(
  coords: [number, number][],
  maxLenMeters: number
): [number, number][] {
  if (coords.length <= 1) return coords
  let total = 0
  const out: [number, number][] = [coords[0]]

  for (let i = 1; i < coords.length; i++) {
    const p1 = turf.point(coords[i - 1])
    const p2 = turf.point(coords[i])
    const segLen = turf.distance(p1, p2, { units: 'meters' })

    if (total + segLen > maxLenMeters) {
      const ratio = (maxLenMeters - total) / segLen
      const x = coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * ratio
      const y = coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * ratio
      out.push([x, y])
      break
    }

    out.push(coords[i])
    total += segLen
  }

  return out
}

async function fetchRoadsNearLocation(lat: number, lon: number) {
  const params = new URLSearchParams({
    f: 'geojson',
    where: '1=1',
    geometry: `${lon},${lat}`, // x=lon, y=lat
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    distance: String(MAX_QUERY_DIST_METERS),
    units: 'esriSRUnit_Meter',
    outFields: '*',
    returnGeometry: 'true',
  })

  const res = await fetch(`${ARCGIS_URL}?${params.toString()}`)
  if (!res.ok) {
    throw new Error(`ArcGIS error: ${res.status} ${res.statusText}`)
  }
  const json = (await res.json()) as FeatureCollection<LineString>
  return json
}

/**
 * Build a leg feature using the endpoint of the UDOT segment that
 * connects at the intersection. We trust the UDOT geometry as truth.
 */
function buildLegFromEndpoint(
  road: Feature<LineString>,
  locId: string,
  endpointIndex: number
): Feature<LineString> | null {
  const coords = road.geometry.coordinates as [number, number][]
  if (coords.length < 2) return null

  let path: [number, number][]
  let intersectionCoord: [number, number]

  if (endpointIndex === 0) {
    // Intersection is at start of the line; walk forward
    intersectionCoord = coords[0]
    path = coords
  } else {
    // Intersection is at end of the line; reverse so we still walk outward
    const reversed = [...coords].reverse()
    intersectionCoord = reversed[0]
    path = reversed
  }

  const trimmed = trimToLength(path, LEG_LENGTH_METERS)
  if (trimmed.length < 2) return null

  const [x1, y1] = trimmed[0]
  const [x2, y2] = trimmed[1]
  const bearing = turf.bearing(turf.point([x1, y1]), turf.point([x2, y2]))
  const dir = bearingToDir(bearing)

  const sourceRoadId =
    (road.properties as any)?.UNIQUE_ID ??
    (road.properties as any)?.OBJECTID ??
    null

  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: trimmed,
    },
    properties: {
      legId: `${locId}_${dir}`,
      locationIdentifier: locId,
      direction: dir,
      sourceRoadId,
      intersectionLon: intersectionCoord[0],
      intersectionLat: intersectionCoord[1],
    },
  }
}

// default export – mount this on a dev-only page and open it once to download the GeoJSON
export default function BuildApproachLegsOnce() {
  const { data } = useLatestVersionOfAllLocations()

  useEffect(() => {
    if (!data?.value) return

    const run = async () => {
      const raw = (data.value as RawLocation[]).filter(
        (l) => l.latitude != null && l.longitude != null
      )

      const locations = raw
      console.log(`Building legs for ${locations.length} locations`)

      const allLegFeatures: Feature<LineString>[] = []

      for (const loc of locations) {
        const lat = loc.latitude
        const lon = loc.longitude
        const locId = String(loc.LocationIdentifier ?? loc.id ?? loc.value)

        const roadsFc = await fetchRoadsNearLocation(lat, lon)
        if (!roadsFc.features.length) continue

        // 1) Collect endpoints of all nearby segments, group by coordinate
        type EndpointRef = {
          road: Feature<LineString>
          endpointIndex: number
        }

        type EndpointGroup = {
          coord: [number, number]
          refs: EndpointRef[]
        }

        const endpointGroups = new Map<string, EndpointGroup>()

        for (const road of roadsFc.features) {
          const coords = road.geometry.coordinates as [number, number][]
          if (!coords.length) continue

          const first: [number, number, number] = [
            coords[0][0],
            coords[0][1],
            0,
          ]
          const last: [number, number, number] = [
            coords[coords.length - 1][0],
            coords[coords.length - 1][1],
            coords.length - 1,
          ]

          for (const [x, y, idx] of [first, last]) {
            const key = `${x.toFixed(6)},${y.toFixed(6)}` // snap to grid
            let group = endpointGroups.get(key)
            if (!group) {
              group = { coord: [x, y], refs: [] }
              endpointGroups.set(key, group)
            }
            group.refs.push({ road, endpointIndex: idx })
          }
        }

        const groupsArr = Array.from(endpointGroups.values())
        if (!groupsArr.length) continue

        // 2) Pick the node with the most incident segments as THE intersection
        groupsArr.sort((a, b) => b.refs.length - a.refs.length)
        const intersectionGroup = groupsArr[0]

        if (intersectionGroup.refs.length < 2) {
          console.warn('Weak intersection for', locId, intersectionGroup)
          continue
        }

        // 3) Build legs from each endpoint in this group
        for (const ref of intersectionGroup.refs) {
          const leg = buildLegFromEndpoint(ref.road, locId, ref.endpointIndex)
          if (leg) allLegFeatures.push(leg)
        }
      }

      const fc: FeatureCollection<LineString> = {
        type: 'FeatureCollection',
        features: allLegFeatures,
      }

      const blob = new Blob([JSON.stringify(fc, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'approach_legs_test.geojson'
      a.click()
      URL.revokeObjectURL(url)

      console.log(
        `Wrote ${allLegFeatures.length} legs to approach_legs_test.geojson`,
        fc
      )
    }

    run().catch((err) => {
      console.error('Error building approach legs', err)
    })
  }, [data])

  return null
}
