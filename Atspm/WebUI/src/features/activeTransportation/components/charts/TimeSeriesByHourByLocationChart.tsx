// /features/activeTransportation/components/charts/TimeSeriesByHourByLocationChart.tsx
import { timeSeriesOfPedestrianVolumeByHourByLocation } from '@/features/activeTransportation/mockdata/pedatMockData'
import ApacheEChart from '@/features/charts/components/apacheEChart'
import timeSeriesByHourByLocationTransformer from '@/features/charts/pedat/timeSeriesByHourByLocationTransformer'
import { Box } from '@mui/material'

const TimeSeriesByHourByLocationChart = () => {
  const option = timeSeriesByHourByLocationTransformer(
    timeSeriesOfPedestrianVolumeByHourByLocation
  )

  return (
    <Box sx={{ mb: 5 }}>
      <ApacheEChart
        id="ped-vol-time-series-hour"
        option={option}
        style={{ width: '100%', height: '400px' }}
      />
    </Box>
  )
}

export default TimeSeriesByHourByLocationChart
