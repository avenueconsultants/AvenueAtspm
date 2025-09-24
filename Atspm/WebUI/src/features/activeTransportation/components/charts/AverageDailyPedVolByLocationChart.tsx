// /features/activeTransportation/components/charts/AverageDailyPedVolByLocationChart.tsx
import { mockdailyPedestrianVolumeByLocation } from '@/features/activeTransportation/mockdata/pedatMockData'
import ApacheEChart from '@/features/charts/components/apacheEChart'
import transformAvgDailyPedVolByLocation from '@/features/charts/pedat/avgDailyPedVolByLocation'
import { Paper } from '@mui/material'

const AverageDailyPedVolByLocationChart = () => {
  const option = transformAvgDailyPedVolByLocation(
    mockdailyPedestrianVolumeByLocation
  )

  return (
    <Paper sx={{ padding: '25px', mb: 5 }}>
      <ApacheEChart
        id="avg-daily-ped-vol"
        option={option}
        style={{ width: '100%', height: '400px' }}
      />
    </Paper>
  )
}

export default AverageDailyPedVolByLocationChart
