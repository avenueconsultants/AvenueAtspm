// ApproachLegsLayer.tsx
import type { Feature, FeatureCollection, LineString } from 'geojson'
import type { PathOptions } from 'leaflet'
import L from 'leaflet'
import { useEffect, useState } from 'react'
import { GeoJSON } from 'react-leaflet'

type LegsFC = FeatureCollection<LineString, any>

type DirLabel = 'Northbound' | 'Southbound' | 'Eastbound' | 'Westbound'

const baseStyle: PathOptions = {
  weight: 2,
  opacity: 0.9,
}

const hoverWeight = 4

type Props = {
  volumes: Record<string, number>
  dirVolumes: Record<string, Partial<Record<DirLabel, number>>>
}

function letterToDirLabel(letter?: string): DirLabel | undefined {
  switch (letter) {
    case 'N':
      return 'Northbound'
    case 'S':
      return 'Southbound'
    case 'E':
      return 'Eastbound'
    case 'W':
      return 'Westbound'
    default:
      return undefined
  }
}

export default function ApproachLegsLayer({ volumes, dirVolumes }: Props) {
  const [fc, setFc] = useState<LegsFC | null>(null)

  useEffect(() => {
    const run = async () => {
      const res = await fetch('/approach_legs_test.geojson')
      if (!res.ok) {
        console.error('Failed to load approach_legs_test.geojson', res.status)
        return
      }
      const json = (await res.json()) as LegsFC
      setFc(json)
    }
    run().catch(console.error)
  }, [])

  const getVolumeForFeature = (
    feature: Feature<LineString, any>
  ): number | undefined => {
    const props = feature.properties ?? {}

    const locId =
      props.locationIdentifier != null
        ? String(props.locationIdentifier)
        : props.legId
          ? String(props.legId).split('_')[0]
          : undefined

    if (!locId) return undefined

    const dirLetter: string | undefined = props.direction
    const dirLabel = letterToDirLabel(dirLetter)

    let v: number | undefined

    if (dirLabel && dirVolumes[locId]) {
      v = dirVolumes[locId]?.[dirLabel]
    }

    if (v == null) {
      v = volumes[locId]
    }

    return typeof v === 'number' && Number.isFinite(v) ? v : undefined
  }

  // 1 → red, 300+ → green, clamp, <1 or no data → grey
  const volumeToColor = (v?: number): string => {
    if (v == null || !Number.isFinite(v) || v < 1) {
      return 'blue'
    }

    const minV = 1
    const maxV = 300

    const tRaw = (v - minV) / (maxV - minV) // 0 at 1, 1 at 300
    const t = Math.max(0, Math.min(1, tRaw))

    // t=0 → red, t=1 → green
    const r = Math.round(255 * (1 - t)) // 255 → 0
    const g = Math.round(255 * t) // 0 → 255
    const b = 0

    return `rgb(${r}, ${g}, ${b})`
  }

  if (!fc) return null

  return (
    <GeoJSON
      data={fc}
      style={(feature) => {
        const v = getVolumeForFeature(feature as Feature<LineString, any>)
        const color = volumeToColor(v)
        return { ...baseStyle, color }
      }}
      onEachFeature={(feature, layer) => {
        const path = layer as L.Path
        const v = getVolumeForFeature(feature as Feature<LineString, any>)
        const color = volumeToColor(v)

        path.setStyle({ ...baseStyle, color })

        layer.on({
          mouseover: () => {
            path.setStyle({
              ...baseStyle,
              color,
              weight: hoverWeight,
              opacity: 1,
            })
            if ((path as any).bringToFront) {
              ;(path as any).bringToFront()
            }
          },
          mouseout: () => {
            path.setStyle({ ...baseStyle, color })
          },
        })

        const props = feature.properties ?? {}

        path.bindPopup(
          L.popup().setContent(
            `<div>
               <strong>location:</strong> ${props.locationIdentifier ?? ''}<br/>
               <strong>direction:</strong> ${props.direction ?? ''}<br/>
               <strong>legId:</strong> ${props.legId ?? ''}<br/>
               <strong>volume:</strong> ${v ?? 'n/a'}
             </div>`
          )
        )
      }}
    />
  )
}
