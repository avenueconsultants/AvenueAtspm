import { useOverheadDigitalSigns } from '@/components/aggTest/hooks/useOverheadDigitalSigns'
import { Color } from '@/features/charts/utils'
import { createPinWithIcon } from '@/features/locations/utils'
import SignpostOutlinedIcon from '@mui/icons-material/Wysiwyg'
import type L from 'leaflet'
import { useEffect, useState } from 'react'
import { Marker } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'

function OverheadSignLayer() {
  const { data: overheadSigns } = useOverheadDigitalSigns()
  const [icon, setIcon] = useState<L.DivIcon | null>(null)

  useEffect(() => {
    let mounted = true
    getOverheadSignPinIcon().then((i) => mounted && setIcon(i))
    return () => {
      mounted = false
    }
  }, [])

  if (!icon) return null

  return (
    <MarkerClusterGroup chunkedLoading disableClusteringAtZoom={14}>
      {overheadSigns?.map((sign) => (
        <Marker
          key={`overheadSign-${sign.Id}`}
          position={[sign.Latitude, sign.Longitude]}
          icon={icon}
        />
      ))}
    </MarkerClusterGroup>
  )
}

export default OverheadSignLayer

let cached: Promise<L.DivIcon> | null = null

export function getOverheadSignPinIcon(): Promise<L.DivIcon> {
  if (!cached) {
    cached = createPinWithIcon({
      color: Color.Green,
      MuiIcon: SignpostOutlinedIcon,
      iconSize: 18,
      offset: 0,
      scale: 0.8,
    })
  }
  return cached
}
