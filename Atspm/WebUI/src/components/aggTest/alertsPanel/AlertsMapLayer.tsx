import { AlertPayload } from '@/components/aggTest/hooks/useAlertsHub'
import { WrongWayMarker } from '@/components/aggTest/WrongWayMarker'

export function AlertsMapLayer({ alerts }: { alerts: AlertPayload[] }) {
  const wrongWayAlerts = getAlertByType(alerts, 'object.wrong-way')

  return <WrongWayMarker alerts={wrongWayAlerts} />
}

const getAlertByType = (
  alerts: AlertPayload[],
  type: string
): AlertPayload[] => {
  return alerts.filter((a) => a.type === type)
}
