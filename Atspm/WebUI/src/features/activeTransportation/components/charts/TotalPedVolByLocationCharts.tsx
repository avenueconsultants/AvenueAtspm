// /features/activeTransportation/components/charts/TotalPedVolByLocationCharts.tsx
import { mockTotalPedestrianVolumeByLocation } from '@/features/activeTransportation/mockdata/pedatMockData'
import ApacheEChart from '@/features/charts/components/apacheEChart'

import {
  transformBlockChartTransformer,
  transformPieChartTransformer,
} from '@/features/charts/pedat/totalPedVolByLocationTransformer'
import { Box, Paper, Typography } from '@mui/material'

const TotalPedVolByLocationCharts = () => {
  const pieOption = transformPieChartTransformer(
    mockTotalPedestrianVolumeByLocation
  )
  const blockOption = transformBlockChartTransformer(
    mockTotalPedestrianVolumeByLocation
  )

  return (
    <Paper sx={{ padding: '25px', mb: 5 }}>
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }} gutterBottom>
          Total Pedestrian Volume, by Location
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          gap: 4,
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ width: '50%', height: 400 }}>
          <ApacheEChart
            id="ped-vol-pie"
            option={pieOption}
            style={{ height: '100%' }}
          />
        </Box>
        <Box sx={{ width: '50%', height: 400 }}>
          <ApacheEChart
            id="ped-vol-block"
            option={blockOption}
            style={{ height: '100%' }}
          />
        </Box>
      </Box>
    </Paper>
  )
}

export default TotalPedVolByLocationCharts
