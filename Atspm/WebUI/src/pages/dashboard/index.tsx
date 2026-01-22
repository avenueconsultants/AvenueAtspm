import AlertsContainer from '@/components/aggTest/alertsPanel/AlertsContainer'
import { useAlertsHub } from '@/components/aggTest/useAlertsHub'
import { Box } from '@mui/material'
import dynamic from 'next/dynamic'
import { useMemo } from 'react'

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

export default function AlertsDashboard() {
  const { state, alerts: events } = useAlertsHub()

  const center = useMemo(() => [40.65311, -111.952445] as [number, number], [])

  const alertsComponent = useMemo(
    () => <AlertsMapLayer alerts={events} />,
    [events]
  )

  const items = useMemo(
    () => [
      {
        id: 'cameras',
        pane: { name: 'cameras', zIndex: 500 },
        element: <CameraLayer />,
      },
      {
        id: 'overheadSigns',
        pane: { name: 'overheadSigns', zIndex: 600 },
        element: <OverheadSignLayer />,
      },
      {
        id: 'alerts',
        pane: { name: 'alerts', zIndex: 700 },
        element: alertsComponent,
      },
    ],
    [alertsComponent]
  )

  return (
    <Box display="flex" flexDirection="row" height="89vh" width="98vw">
      <ClientMap center={center} items={items} height={810} />

      <Box width={400} height="100%">
        <AlertsContainer events={events} hubState={state} />
      </Box>
    </Box>
  )
}
