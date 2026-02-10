import { AlertDemoTriggers } from '@/components/aggTest/AlertDemoTriggers'
import AlertsContainer from '@/components/aggTest/alertsPanel/AlertsContainer'
import WrongWayIncidentDock from '@/components/aggTest/alertsPanel/WrongWayIncidentDock'
import type { UiAlert } from '@/components/aggTest/hooks/types'
import { useAlertsHub } from '@/components/aggTest/hooks/useAlertsHub'
import { Alert, Box } from '@mui/material'
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
  return sev === 'number' ? sev === 10 : Number(sev) === 10
}

export default function AlertsDashboard() {
  const { state, alerts: hubEvents } = useAlertsHub()

  const center = useMemo(() => [40.65311, -111.952445] as [number, number], [])

  const [demoEvents, setDemoEvents] = useState<UiAlert[]>([])

  const handleTriggerDemo = useCallback((a: UiAlert) => {
    setDemoEvents((prev) => [a, ...prev].slice(0, 250))
  }, [])

  const events = useMemo(() => {
    const merged = [...hubEvents, ...demoEvents]
    merged.sort(
      (a, b) => Date.parse(b.timestampUtc) - Date.parse(a.timestampUtc)
    )
    return merged
  }, [hubEvents, demoEvents])

  const [dockAlert, setDockAlert] = useState<UiAlert | null>(null)
  const [dockOpen, setDockOpen] = useState(true)

  // Prevent immediate re-open for the same update
  const lastDockKeyRef = useRef<string | null>(null)

  useEffect(() => {
    const newest = (events ?? [])
      .filter((a) => a && isSev10(a.severity) && a.type === 'WrongWayVehicle')
      .sort(
        (a, b) => Date.parse(b.timestampUtc) - Date.parse(a.timestampUtc)
      )[0]

    if (!newest) return

    const key = `${newest.id}|${newest.timestampUtc}`
    if (lastDockKeyRef.current === key) return

    lastDockKeyRef.current = key
    setDockAlert(newest)
    setDockOpen(true) // auto-expand on new incident/update
  }, [events])

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
        defaultChecked: false,
        element: <CameraLayer />,
      },
      {
        id: 'overheadSigns',
        pane: { name: 'overheadSigns', zIndex: 600 },
        toggleLabel: 'Overhead signs',
        defaultChecked: false,
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
      <>
        {dockAlert ? (
          <WrongWayIncidentDock
            alert={dockAlert}
            isOpen={dockOpen}
            onToggleOpen={() => setDockOpen((v) => !v)}
            onClose={() => setDockAlert(null)}
            onJumpTo={(ll) => handleJump(ll, dockAlert.id)}
          />
        ) : null}
      </>
    ),
    [handleJump, dockAlert, dockOpen]
  )

  return (
    <Box display="flex" flexDirection="column">
      <Alert
        variant="filled"
        severity="error"
        sx={{
          marginBottom: '8px',
          marginTop: '-16px',
          marginLeft: '-16px',
          margin: '-16px -16px 8px',
        }}
      >
        This application does not replace 911 or emergency dispatch services. In
        an emergency, always call 911. This app is intended to supplement and
        enhance response coordination and situational awareness.
      </Alert>

      <Box
        sx={{
          marginBottom: '8px',
          marginTop: '-16px',
          marginLeft: '-16px',
          margin: '0px -16px',
        }}
      >
        <AlertDemoTriggers
          center={center}
          onTrigger={handleTriggerDemo}
          onClearAll={() => setDemoEvents([])}
        />
      </Box>

      <Box
        display="flex"
        flexDirection="row"
        height="calc(100vh - 200px)"
        width="100vw"
        margin={'-0px 0px -24px -24px'}
      >
        <ClientMap
          center={center}
          items={items}
          height={'calc(100vh - 200px)'}
          overlays={overlays}
          flyTo={flyTo}
        />

        <Box height={'calc(100vh - 200px)'}>
          <AlertsContainer events={events} hubState={state} />
        </Box>
      </Box>
    </Box>
  )
}
