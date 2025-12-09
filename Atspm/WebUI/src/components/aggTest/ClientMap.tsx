import ApproachLegsLayer from '@/components/aggTest/ApproachLegsLayer'
import type { LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import dynamic from 'next/dynamic'
import { CircleMarker, MapContainer, Pane, TileLayer } from 'react-leaflet'

const HeatmapOverlay = dynamic(() => import('./HeatmapOverlay'), {
  ssr: false,
})

type Loc = { id: string; lat: number; lng: number; raw?: any }
type Dir = 'Northbound' | 'Southbound' | 'Eastbound' | 'Westbound'

export default function ClientMap({
  alerts,
  center,
  locations,
  volumes,
  dirVolumes,
}: {
  alerts: any[]
  center: [number, number]
  locations: Loc[]
  volumes: Record<string, number>
  dirVolumes: Record<string, Partial<Record<Dir, number>>>
}) {
  const alertPositions =
    alerts
      ?.map((a) => {
        // expect locationIdentifier to be [lat, lng] (strings or numbers)
        const loc = [40.738231, -111.904155]
        if (!Array.isArray(loc) || loc.length < 2) return null

        const lat = Number(loc[0])
        const lng = Number(loc[1])
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null

        return { lat, lng }
      })
      .filter(Boolean) ?? []

  console.log('alertPositions:', alertPositions)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer
        key={`${center[0]}-${center[1]}`}
        center={center as LatLngExpression}
        zoom={11}
        style={{ position: 'absolute', inset: 0, height: '700px' }}
        attributionControl
      >
        <TileLayer
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
          attribution="© OpenStreetMap contributors"
        />

        <Pane name="approach-legs" style={{ zIndex: 500 }}>
          <ApproachLegsLayer
            locations={locations}
            volumes={volumes}
            dirVolumes={dirVolumes}
          />
        </Pane>

        <Pane name="echarts" style={{ zIndex: 450, pointerEvents: 'none' }}>
          {/* heatmap disabled for now */}
        </Pane>

        <Pane name="markers" style={{ zIndex: 650 }}>
          {/* totals disabled for now */}
        </Pane>

        {/* NEW: alerts pane */}
        <Pane name="alerts" style={{ zIndex: 700 }}>
          {alertPositions.map((p, idx) => (
            <CircleMarker
              key={`${p!.lat}-${p!.lng}-${idx}`}
              center={[p!.lat, p!.lng]}
              radius={16}
              pathOptions={{
                color: 'red',
                fillColor: 'red',
                fillOpacity: 0.6,
              }}
              className="alert-pulse"
            />
          ))}
        </Pane>
      </MapContainer>

      {/* pulsing-dot CSS */}
      <style jsx global>{`
        .alert-pulse {
          /* keep dot anchored while scaling */
          transform-box: fill-box;
          transform-origin: center;
          animation: alert-pulse 0.6s linear infinite;
        }

        @keyframes alert-pulse {
          0% {
            transform: scale(0.7);
            opacity: 0.9;
          }
          70% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(0.7);
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  )
}
