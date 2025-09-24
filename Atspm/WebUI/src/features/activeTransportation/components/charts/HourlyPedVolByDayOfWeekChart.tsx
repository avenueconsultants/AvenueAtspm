// /features/activeTransportation/components/charts/HourlyPedVolByDayOfWeekChart.tsx
import { mockDailyPedestrianVolumeByDayOfWeek } from '@/features/activeTransportation/mockdata/pedatMockData'
import ApacheEChart from '@/features/charts/components/apacheEChart'
import transformHourlyPedVolByDayOfWeekTransformer from '@/features/charts/pedat/hourlyPedVolByDayOfWeekTransformer'
import { Paper } from '@mui/material'

const HourlyPedVolByDayOfWeekChart = () => {
  const option = transformHourlyPedVolByDayOfWeekTransformer(
    mockDailyPedestrianVolumeByDayOfWeek
  )

  return (
    <Paper sx={{ padding: '25px', mb: 5 }}>
      <ApacheEChart
        id="hourly-ped-vol-day-of-week"
        option={option}
        style={{ width: '100%', height: '400px' }}
      />
    </Paper>
  )
}

export default HourlyPedVolByDayOfWeekChart
