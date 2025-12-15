import { LatLngExpression } from 'leaflet'
import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

type FlyToReq = {
  seq: number
  alertKey: string
  center: [number, number]
  zoom?: number
}

export function FlyToController({
  flyTo,
}: {
  flyTo: FlyToReq | null | undefined
}) {
  const map = useMap()

  useEffect(() => {
    if (!flyTo) return
    map.flyTo(flyTo.center as LatLngExpression, flyTo.zoom ?? map.getZoom(), {
      animate: true,
      duration: 0.6,
    })
  }, [flyTo?.seq]) // ✅ only runs on new request

  return null
}
