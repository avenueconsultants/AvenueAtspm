import { FlyToController } from '@/components/aggTest/FlyToController'
import { type LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useMemo } from 'react'
import { MapContainer, Pane, TileLayer } from 'react-leaflet'

export type MapPaneSpec = {
  name: string
  zIndex?: number
  pointerEvents?: 'auto' | 'none'
}

export type MapItem = {
  id: string
  pane?: MapPaneSpec
  element: React.ReactNode
}

export default function BaseMap({
  center,
  zoom = 11,
  height = 700,
  tileUrl = 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
  tileAttribution = '© OpenStreetMap contributors',
  items,
  mapKey,
  flyTo,
}: {
  center: [number, number]
  zoom?: number
  height?: number
  tileUrl?: string
  tileAttribution?: string
  items: MapItem[]
  mapKey?: string
  flyTo?: {
    seq: number
    alertKey: string
    center: [number, number]
    zoom?: number
  }
}) {
  const { direct, panes } = useMemo(() => {
    const direct: React.ReactNode[] = []
    const paneMap = new Map<
      string,
      { spec: MapPaneSpec; elements: React.ReactNode[] }
    >()

    for (const item of items) {
      if (!item.pane) {
        direct.push(<span key={item.id}>{item.element}</span>)
        continue
      }

      const key = item.pane.name
      const existing = paneMap.get(key)
      if (existing) {
        existing.elements.push(item.element)
      } else {
        paneMap.set(key, { spec: item.pane, elements: [item.element] })
      }
    }

    return {
      direct,
      panes: Array.from(paneMap.entries()).map(([name, v]) => ({
        name,
        spec: v.spec,
        elements: v.elements,
      })),
    }
  }, [items])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer
        key={mapKey ?? `${center[0]}-${center[1]}`}
        center={center as LatLngExpression}
        zoom={zoom}
        style={{ position: 'absolute', inset: 0, height }}
        attributionControl
      >
        <FlyToController flyTo={flyTo} />
        <TileLayer url={tileUrl} attribution={tileAttribution} />

        {direct}

        {panes.map((p) => (
          <Pane
            key={p.name}
            name={p.name}
            style={{
              zIndex: p.spec.zIndex,
              pointerEvents: p.spec.pointerEvents,
            }}
          >
            {p.elements.map((el, idx) => (
              <span key={`${p.name}-${idx}`}>{el}</span>
            ))}
          </Pane>
        ))}
      </MapContainer>
    </div>
  )
}
