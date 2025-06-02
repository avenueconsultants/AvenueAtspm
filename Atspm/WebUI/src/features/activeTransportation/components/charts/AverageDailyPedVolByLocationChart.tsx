// /features/activeTransportation/components/charts/AverageDailyPedVolByLocationChart.tsx
import { mockdailyPedestrianVolumeByLocation } from '@/features/activeTransportation/mockdata/pedatMockData'
import ApacheEChart from '@/features/charts/components/apacheEChart'
import transformAvgDailyPedVolByLocation from '@/features/charts/pedat/avgDailyPedVolByLocation'
import { Box } from '@mui/material'

const AverageDailyPedVolByLocationChart = () => {
  const option = transformAvgDailyPedVolByLocation(
    mockdailyPedestrianVolumeByLocation
  )

  return (
    <Box sx={{ mb: 5 }}>
      <ApacheEChart
        id="avg-daily-ped-vol"
        option={option}
        style={{ width: '100%', height: '400px' }}
      />
    </Box>
  )
}

export default AverageDailyPedVolByLocationChart
