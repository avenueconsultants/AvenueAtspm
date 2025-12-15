import AlertsContainer from '@/components/aggTest/alertsPanel/AlertsContainer'
import { useAlertsHubMock } from '@/components/aggTest/useAlertsHubMock'
import { Box } from '@mui/material'
import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'

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

type FlyToReq = {
  seq: number
  alertKey: string
  center: [number, number]
  zoom?: number
}

export default function DemoWsMapPage() {
  const { state, events } = useAlertsHubMock()

  const center = useMemo(() => [40.65311, -111.952445] as [number, number], [])
  const [flyTo, setFlyTo] = useState<FlyToReq | null>(null)

  const handleFlyTo = (req: {
    alertKey: string
    position: { lat: number; lng: number }
    zoom?: number
  }) => {
    setFlyTo((prev) => ({
      seq: (prev?.seq ?? 0) + 1,
      alertKey: req.alertKey,
      center: [req.position.lat, req.position.lng],
      zoom: req.zoom ?? 15,
    }))
  }

  const items = useMemo(() => {
    return [
      {
        id: 'alerts',
        pane: { name: 'alerts', zIndex: 700 },
        element: <AlertsMapLayer events={events} />,
      },
    ]
  }, [events])

  return (
    <Box display="flex" flexDirection="row" height="89vh" width="98vw">
      <ClientMap center={center} items={items} height={810} flyTo={flyTo} />

      <Box width={400} height="100%">
        <AlertsContainer
          events={events}
          hubState={state}
          onFlyTo={handleFlyTo}
        />
      </Box>
    </Box>
  )
}
