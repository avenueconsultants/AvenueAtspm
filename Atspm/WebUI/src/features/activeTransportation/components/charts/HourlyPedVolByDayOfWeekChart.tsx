// /features/activeTransportation/components/charts/HourlyPedVolByDayOfWeekChart.tsx
import { mockDailyPedestrianVolumeByDayOfWeek } from '@/features/activeTransportation/mockdata/pedatMockData'
import ApacheEChart from '@/features/charts/components/apacheEChart'
import transformHourlyPedVolByDayOfWeekTransformer from '@/features/charts/pedat/hourlyPedVolByDayOfWeekTransformer'

const HourlyPedVolByDayOfWeekChart = () => {
  const option = transformHourlyPedVolByDayOfWeekTransformer(
    mockDailyPedestrianVolumeByDayOfWeek
  )

  return (
    <ApacheEChart
      id="hourly-ped-vol-day-of-week"
      option={option}
      style={{ width: '100%', height: '400px' }}
    />
  )
}

export default HourlyPedVolByDayOfWeekChart
