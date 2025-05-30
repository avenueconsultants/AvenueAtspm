// /features/activeTransportation/components/charts/HourlyPedVolByHourOfDayChart.tsx
import { mockHourlyPedestrianVolume } from '@/features/activeTransportation/mockdata/pedatMockData'
import ApacheEChart from '@/features/charts/components/apacheEChart'
import transformHourlyPedVolByHourOfDay from '@/features/charts/pedat/avgHourlyPedVolByHour'

const HourlyPedVolByHourOfDayChart = () => {
  const option = transformHourlyPedVolByHourOfDay(mockHourlyPedestrianVolume)

  return (
    <ApacheEChart
      id="hourly-ped-vol-hour-of-day"
      option={option}
      style={{ width: '100%', height: '400px' }}
    />
  )
}

export default HourlyPedVolByHourOfDayChart
