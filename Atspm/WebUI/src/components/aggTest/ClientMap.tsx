import ApproachLegsLayer from '@/components/aggTest/ApproachLegsLayer'
import type { LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import dynamic from 'next/dynamic'
import { MapContainer, Pane, TileLayer } from 'react-leaflet'
// import ApproachLegsLayer from './ApproachLegsLayer'

const HeatmapOverlay = dynamic(() => import('./HeatmapOverlay'), {
  ssr: false,
})

type Loc = { id: string; lat: number; lng: number; raw?: any }
type Dir = 'Northbound' | 'Southbound' | 'Eastbound' | 'Westbound'

export default function ClientMap({
  center,
  locations,
  volumes,
  dirVolumes,
}: {
  center: [number, number]
  locations: Loc[]
  volumes: Record<string, number>
  dirVolumes: Record<string, Partial<Record<Dir, number>>>
}) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer
        key={`${center[0]}-${center[1]}`}
        center={center as LatLngExpression}
        zoom={11}
        style={{ position: 'absolute', inset: 0, height: '500px' }}
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
          {/* <HeatmapOverlay
            locations={locations.map((l) => ({
              id: l.id,
              lat: l.lat,
              lng: l.lng,
            }))}
            volumes={volumes}
          /> */}
        </Pane>

        <Pane name="markers" style={{ zIndex: 650 }}>
          {/* <TotalsLayer
            locations={locations.map((l) => ({
              id: l.id,
              lat: l.lat,
              lng: l.lng,
            }))}
            volumes={volumes}
            dirVolumes={dirVolumes}
          /> */}
        </Pane>
      </MapContainer>
    </div>
  )
}
