import AlertsContainer from '@/components/aggTest/alertsPanel/AlertsContainer'
import {
  AlertPayload,
  useAlertsHub,
} from '@/components/aggTest/hooks/useAlertsHub'
import { WrongWayBanner } from '@/components/aggTest/WrongWayBanner'
import { Box } from '@mui/material'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type MapPaneSpec = {
  name: string
  zIndex?: number
  pointerEvents?: 'auto' | 'none'
}

export type MapItem = {
  id: string
  pane?: MapPaneSpec
  element: React.ReactNode
  toggleable?: boolean
  toggleLabel?: string
  defaultChecked?: boolean
}

const ClientMap = dynamic(() => import('@/components/aggTest/ClientMap'), {
  ssr: false,
})

const AlertsMapLayer = dynamic(
  () =>
    import('@/components/aggTest/alertsPanel/AlertsMapLayer').then(
      (m) => m.AlertsMapLayer
    ),
  { ssr: false }
)

const OverheadSignLayer = dynamic(
  () =>
    import('@/components/aggTest/layers/OverheadSignLayer').then(
      (m) => m.default
    ),
  { ssr: false }
)

const CameraLayer = dynamic(
  () =>
    import('@/components/aggTest/layers/CameraLayer').then((m) => m.default),
  { ssr: false }
)

function isSev10(sev: unknown) {
  return typeof sev === 'number' ? sev === 10 : Number(sev) === 10
}

export default function AlertsDashboard() {
  const { state, alerts: events } = useAlertsHub()

  const center = useMemo(() => [40.65311, -111.952445] as [number, number], [])

  const alertsComponent = useMemo(
    () => <AlertsMapLayer alerts={events} />,
    [events]
  )

  const items: MapItem[] = useMemo(
    () => [
      {
        id: 'cameras',
        pane: { name: 'cameras', zIndex: 500 },
        toggleLabel: 'Cameras',
        defaultChecked: true,
        element: <CameraLayer />,
      },
      {
        id: 'overheadSigns',
        pane: { name: 'overheadSigns', zIndex: 600 },
        toggleLabel: 'Overhead signs',
        defaultChecked: true,
        element: <OverheadSignLayer />,
      },
      {
        id: 'alerts',
        pane: { name: 'alerts', zIndex: 700 },
        toggleable: false,
        element: alertsComponent,
      },
      {
        id: 'popups',
        pane: { name: 'popups', zIndex: 10_000, pointerEvents: 'auto' },
        toggleable: false,
        element: null, // Popups are added to the map by other layers.
      },
    ],
    [alertsComponent]
  )

  const [bannerAlert, setBannerAlert] = useState<AlertPayload | null>(null)
  const lastShownKeyRef = useRef<string | null>(null)

  const [flyTo, setFlyTo] = useState<
    | {
        seq: number
        alertKey: string
        center: [number, number]
        zoom?: number
      }
    | undefined
  >(undefined)

  const flySeqRef = useRef(0)

  useEffect(() => {
    const newest = (events ?? [])
      .filter((a) => a && isSev10(a.severity) && a.type === 'object.wrong-way')
      .sort(
        (a, b) => Date.parse(b.timestampUtc) - Date.parse(a.timestampUtc)
      )[0]

    if (!newest) return

    const key = `${newest.id}|${newest.timestampUtc}`
    if (lastShownKeyRef.current === key) return

    lastShownKeyRef.current = key
    setBannerAlert(newest)
  }, [events])

  const handleJump = useCallback(
    (ll: { lat: number; lng: number }, alertKey: string) => {
      const seq = ++flySeqRef.current
      setFlyTo({
        seq,
        alertKey,
        center: [ll.lat, ll.lng],
        zoom: 16,
      })
    },
    []
  )

  const overlays = useMemo(
    () => (
      <WrongWayBanner
        alert={bannerAlert}
        onClose={() => setBannerAlert(null)}
        onJump={handleJump}
      />
    ),
    [bannerAlert, handleJump]
  )

  return (
    <Box
      display="flex"
      flexDirection="row"
      height="89vh"
      width="100vw"
      margin={'-24px 0px -24px -24px'}
    >
      <ClientMap
        center={center}
        items={items}
        height={'calc(100vh - 60px)'}
        overlays={overlays}
        flyTo={flyTo}
      />

      {/* <Box position="absolute" bottom={20} right={16} zIndex={10}>
        <Button onClick={triggerWrongWay}>Trigger wrong-way</Button>
      </Box> */}

      <Box height={'calc(100vh - 60px)'}>
        <AlertsContainer events={events} hubState={state} />
      </Box>
    </Box>
  )
}
