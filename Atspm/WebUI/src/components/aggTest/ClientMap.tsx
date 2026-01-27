import { FlyToController } from '@/components/aggTest/FlyToController'
import { MapItem, MapPaneSpec } from '@/pages/dashboard'
import { type LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useMemo } from 'react'
import {
  LayerGroup,
  LayersControl,
  MapContainer,
  Pane,
  TileLayer,
} from 'react-leaflet'

export default function BaseMap({
  center,
  zoom = 11,
  height = 700,
  tileUrl = 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
  tileAttribution = '© OpenStreetMap contributors',
  items,
  mapKey,
  flyTo,
  overlays,
}: {
  center: [number, number]
  zoom?: number
  height?: number | string
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
  overlays?: React.ReactNode
}) {
  const { direct, panes } = useMemo(() => {
    const direct: React.ReactNode[] = []
    const paneMap = new Map<
      string,
      { spec: MapPaneSpec; elements: React.ReactNode[]; toggleable: boolean }
    >()

    for (const item of items) {
      if (!item.pane) {
        direct.push(<span key={item.id}>{item.element}</span>)
        continue
      }

      const key = item.pane.name
      const existing = paneMap.get(key)
      const isToggleable = item.toggleable !== false // default true
      if (existing) {
        existing.elements.push(item.element)
        existing.toggleable = existing.toggleable || isToggleable
      } else {
        paneMap.set(key, {
          spec: item.pane,
          elements: [item.element],
          toggleable: isToggleable,
        })
      }
    }

    return {
      direct,
      panes: Array.from(paneMap.entries()).map(([name, v]) => ({
        name,
        spec: v.spec,
        elements: v.elements,
        toggleable: v.toggleable,
      })),
    }
  }, [items])

  // label + defaultChecked per pane (from any item in that pane)
  const paneMeta = useMemo(() => {
    const meta = new Map<string, { label: string; defaultChecked: boolean }>()
    for (const item of items) {
      if (!item.pane) continue
      const name = item.pane.name
      if (!meta.has(name)) {
        meta.set(name, {
          label: item.toggleLabel ?? name,
          defaultChecked: item.defaultChecked ?? true,
        })
      }
    }
    return meta
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
        <LayersControl position="bottomright">
          {direct}

          {panes.map((p) => {
            const m = paneMeta.get(p.name) ?? {
              label: p.name,
              defaultChecked: true,
            }

            if (!p.toggleable) {
              return (
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
              )
            }

            return (
              <LayersControl.Overlay
                key={p.name}
                name={m.label}
                checked={m.defaultChecked}
              >
                <LayerGroup>
                  <Pane
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
                </LayerGroup>
              </LayersControl.Overlay>
            )
          })}
        </LayersControl>
      </MapContainer>

      {overlays}
    </div>
  )
}
