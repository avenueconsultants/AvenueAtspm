// /features/activeTransportation/components/charts/DailyPedVolByMonthChart.tsx
import { mockDailyPedestrianVolumeByMonth } from '@/features/activeTransportation/mockdata/pedatMockData'
import ApacheEChart from '@/features/charts/components/apacheEChart'
import transformDailyPedVolByMonthTransformer from '@/features/charts/pedat/dailyPedVolByMonthTransformer'
import { Paper } from '@mui/material'

const DailyPedVolByMonthChart = () => {
  const option = transformDailyPedVolByMonthTransformer(
    mockDailyPedestrianVolumeByMonth
  )

  return (
    <Paper sx={{ padding: '25px', mb: 5 }}>
      <ApacheEChart
        id="daily-ped-vol-month"
        option={option}
        style={{ width: '100%', height: '400px' }}
      />
    </Paper>
  )
}

export default DailyPedVolByMonthChart
