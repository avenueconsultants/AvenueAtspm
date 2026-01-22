import { useCameras } from '@/components/aggTest/hooks/useCameras'
import type L from 'leaflet'
import { useEffect, useState } from 'react'
import { Marker } from 'react-leaflet'

function CameraLayer() {
  const { data: cameras } = useCameras()
  const [icon, setIcon] = useState<L.DivIcon | null>(null)

  useEffect(() => {
    let mounted = true
    getCameraPinIcon().then((i) => mounted && setIcon(i))
    return () => {
      mounted = false
    }
  }, [])

  if (!icon) return null

  return (
    <MarkerClusterGroup chunkedLoading disableClusteringAtZoom={14}>
      {cameras?.map((camera) => (
        <Marker
          key={`camera-${camera.Id}`}
          position={[camera.Latitude, camera.Longitude]}
          icon={icon}
        />
      ))}
    </MarkerClusterGroup>
  )
}

export default CameraLayer

import { Color } from '@/features/charts/utils'
import { createPinWithIcon } from '@/features/locations/utils'
import VideocamIcon from '@mui/icons-material/Videocam'
import MarkerClusterGroup from 'react-leaflet-cluster'

let cached: Promise<L.DivIcon> | null = null

export function getCameraPinIcon(): Promise<L.DivIcon> {
  if (!cached) {
    cached = createPinWithIcon({
      color: Color.Blue,
      MuiIcon: VideocamIcon,
      iconSize: 18,
      offset: 0,
      scale: 0.8,
    })
  }
  return cached
}
