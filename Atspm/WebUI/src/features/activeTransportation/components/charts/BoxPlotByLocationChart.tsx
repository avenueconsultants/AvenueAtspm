// /features/activeTransportation/components/charts/BoxPlotByLocationChart.tsx
import { mockBoxPlotPedestrianVolumeByLocation } from '@/features/activeTransportation/mockdata/pedatMockData'
import ApacheEChart from '@/features/charts/components/apacheEChart'
import transformBoxPlotByLocationTransformer from '@/features/charts/pedat/boxPlotByLocationTransformer'
import { Paper } from '@mui/material'

const BoxPlotByLocationChart = () => {
  const option = transformBoxPlotByLocationTransformer(
    mockBoxPlotPedestrianVolumeByLocation
  )

  return (
    <Paper sx={{ padding: '25px', mb: 5 }}>
      <ApacheEChart
        id="ped-vol-boxplot-location"
        option={option}
        style={{ width: '100%', height: '400px' }}
      />
    </Paper>
  )
}

export default BoxPlotByLocationChart
