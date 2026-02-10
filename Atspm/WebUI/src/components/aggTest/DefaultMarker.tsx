// DefaultMarker.tsx
import { UiAlert } from '@/components/aggTest/hooks/types'
import { CircleMarker, Tooltip } from 'react-leaflet'

type LatLng = { lat: number; lng: number }

export type DefaultMarkerStyle = {
  radius?: number
  color?: string
  fillColor?: string
  fillOpacity?: number
  opacity?: number
  weight?: number
}

export function DefaultMarker({
  alerts,
  getLatLng,
  style,
  tooltip,
}: {
  alerts: UiAlert[]
  getLatLng: (a: UiAlert) => LatLng | null
  style?: DefaultMarkerStyle
  tooltip?: (a: UiAlert) => React.ReactNode
}) {
  return (
    <>
      {alerts.map((a) => {
        const ll = getLatLng(a)
        if (!ll) return null

        const s = {
          radius: style?.radius ?? 6,
          color: style?.color ?? '#1976d2',
          fillColor: style?.fillColor ?? style?.color ?? '#1976d2',
          fillOpacity: style?.fillOpacity ?? 0.9,
          opacity: style?.opacity ?? 1,
          weight: style?.weight ?? 2,
        }

        return (
          <CircleMarker
            key={`default-${a.id}`}
            center={[ll.lat, ll.lng]}
            radius={s.radius}
            pathOptions={{
              color: s.color,
              fillColor: s.fillColor,
              fillOpacity: s.fillOpacity,
              opacity: s.opacity,
              weight: s.weight,
            }}
          >
            {tooltip ? <Tooltip direction="top">{tooltip(a)}</Tooltip> : null}
          </CircleMarker>
        )
      })}
    </>
  )
}
