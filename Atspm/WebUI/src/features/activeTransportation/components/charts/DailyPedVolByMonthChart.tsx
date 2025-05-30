// /features/activeTransportation/components/charts/DailyPedVolByMonthChart.tsx
import { mockDailyPedestrianVolumeByMonth } from '@/features/activeTransportation/mockdata/pedatMockData'
import ApacheEChart from '@/features/charts/components/apacheEChart'
import transformDailyPedVolByMonthTransformer from '@/features/charts/pedat/dailyPedVolByMonthTransformer'

const DailyPedVolByMonthChart = () => {
  const option = transformDailyPedVolByMonthTransformer(
    mockDailyPedestrianVolumeByMonth
  )

  return (
    <ApacheEChart
      id="daily-ped-vol-month"
      option={option}
      style={{ width: '100%', height: '400px' }}
    />
  )
}

export default DailyPedVolByMonthChart
