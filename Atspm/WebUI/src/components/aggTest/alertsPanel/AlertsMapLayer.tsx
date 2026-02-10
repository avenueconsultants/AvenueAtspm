// AlertsMapLayer.tsx
import type { UiAlert } from '@/components/aggTest/hooks/useAlertsHub'
import { WrongWayMarker } from '@/components/aggTest/WrongWayMarker'

import { Color } from '@/features/charts/utils'
import { createPinWithIcon } from '@/features/locations/utils'
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined'
import CropFreeOutlinedIcon from '@mui/icons-material/CropFreeOutlined'
import { Box, Typography } from '@mui/material'
import type L from 'leaflet'
import { memo, useEffect, useMemo, useState } from 'react'
import { Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'

type LatLng = { lat: number; lng: number }

export function AlertsMapLayer({ alerts }: { alerts: UiAlert[] }) {
  const wrongWayAlerts = useMemo(
    () => getAlertByType(alerts, 'WrongWayVehicle'),
    [alerts]
  )

  const loiteringAlerts = useMemo(
    () => getAlertByType(alerts, 'Loitering'),
    [alerts]
  )

  const objectInZoneAlerts = useMemo(
    () => getAlertByType(alerts, 'ObjectInZone'),
    [alerts]
  )

  return (
    <>
      <WrongWayMarker alerts={wrongWayAlerts} />

      <LoiteringMarker alerts={loiteringAlerts} />
      <ObjectInZoneMarker alerts={objectInZoneAlerts} />
    </>
  )
}

const getAlertByType = (alerts: UiAlert[], type: string): UiAlert[] => {
  return alerts.filter((a) => a.type === type)
}

// Default extractor that tries a few common shapes.
// Tighten this once you standardize lat/lng across alert DTOs.
function getDefaultAlertLatLng(a: UiAlert): LatLng | null {
  const p: any = a.payload

  // Most likely (recommended) shape
  const lat = p?.latitude ?? p?.lat ?? p?.object?.latitude
  const lng = p?.longitude ?? p?.lng ?? p?.object?.longitude
  if (typeof lat === 'number' && typeof lng === 'number') return { lat, lng }

  // Fallback: any trackingLogs entries that include lat/lng
  const logs = Array.isArray(p?.trackingLogs) ? p.trackingLogs : null
  if (logs?.length) {
    const last = logs[logs.length - 1]
    const llat = last?.latitude
    const llng = last?.longitude
    if (typeof llat === 'number' && typeof llng === 'number')
      return { lat: llat, lng: llng }

    const pos = last?.position
    if (
      Array.isArray(pos) &&
      pos.length >= 2 &&
      typeof pos[0] === 'number' &&
      typeof pos[1] === 'number'
    ) {
      return { lat: pos[0], lng: pos[1] }
    }
  }

  return null
}

function AlertPopup({ a }: { a: UiAlert }) {
  return (
    <Box sx={{ minWidth: 220, maxWidth: 360 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
        {a.type}
      </Typography>

      {a.message ? (
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {a.message}
        </Typography>
      ) : null}

      {a.locationIdentifier ? (
        <Typography
          variant="caption"
          sx={{ mt: 0.75, display: 'block', opacity: 0.8 }}
        >
          {a.locationIdentifier}
        </Typography>
      ) : null}
    </Box>
  )
}

function BasePinMarkerLayer({
  alerts,
  getIcon,
}: {
  alerts: UiAlert[]
  getIcon: () => Promise<L.DivIcon>
}) {
  const [icon, setIcon] = useState<L.DivIcon | null>(null)

  useEffect(() => {
    let mounted = true
    getIcon().then((i) => mounted && setIcon(i))
    return () => {
      mounted = false
    }
  }, [getIcon])

  const items = useMemo(() => {
    return (alerts ?? [])
      .map((a) => ({ a, ll: getDefaultAlertLatLng(a) }))
      .filter((x): x is { a: UiAlert; ll: LatLng } => !!x.ll)
  }, [alerts])

  if (!icon) return null
  if (!items.length) return null

  return (
    <MarkerClusterGroup chunkedLoading disableClusteringAtZoom={14}>
      {items.map(({ a, ll }, idx) => (
        <Marker
          key={`${a.type}-${(a as any).id ?? (a as any).alertId ?? idx}`}
          position={[ll.lat, ll.lng]}
          icon={icon}
        >
          <Popup pane="popups" maxWidth={420} offset={[0, -20]} closeButton>
            <AlertPopup a={a} />
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  )
}

const LoiteringMarker = memo(function LoiteringMarker({
  alerts,
}: {
  alerts: UiAlert[]
}) {
  return <BasePinMarkerLayer alerts={alerts} getIcon={getLoiteringPinIcon} />
})

const ObjectInZoneMarker = memo(function ObjectInZoneMarker({
  alerts,
}: {
  alerts: UiAlert[]
}) {
  return <BasePinMarkerLayer alerts={alerts} getIcon={getObjectInZonePinIcon} />
})

let loiteringCached: Promise<L.DivIcon> | null = null
function getLoiteringPinIcon(): Promise<L.DivIcon> {
  if (!loiteringCached) {
    loiteringCached = createPinWithIcon({
      color: Color.Orange,
      MuiIcon: AccessTimeOutlinedIcon,
      iconSize: 18,
      offset: 0,
      scale: 0.8,
    })
  }
  return loiteringCached
}

let objectInZoneCached: Promise<L.DivIcon> | null = null
function getObjectInZonePinIcon(): Promise<L.DivIcon> {
  if (!objectInZoneCached) {
    objectInZoneCached = createPinWithIcon({
      color: Color.Green,
      MuiIcon: CropFreeOutlinedIcon,
      iconSize: 18,
      offset: 0,
      scale: 0.8,
    })
  }
  return objectInZoneCached
}
