// /features/activeTransportation/components/charts/AverageDailyPedVolByLocationChart.tsx
import { mockdailyPedestrianVolumeByLocation } from '@/features/activeTransportation/mockdata/pedatMockData'
import ApacheEChart from '@/features/charts/components/apacheEChart'
import transformAvgDailyPedVolByLocation from '@/features/charts/pedat/avgDailyPedVolByLocation'

const AverageDailyPedVolByLocationChart = () => {
  const option = transformAvgDailyPedVolByLocation(
    mockdailyPedestrianVolumeByLocation
  )

  return (
    <ApacheEChart
      id="avg-daily-ped-vol"
      option={option}
      style={{ width: '100%', height: '400px' }}
    />
  )
}

export default AverageDailyPedVolByLocationChart
