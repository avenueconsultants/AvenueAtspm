// /features/activeTransportation/components/charts/BoxPlotByLocationChart.tsx
import { PedatChartsContainerProps } from '@/features/activeTransportation/components/pedatChartsContainer'
import ApacheEChart from '@/features/charts/components/apacheEChart'
import transformBoxPlotByLocationTransformer from '@/features/charts/pedat/boxPlotByLocationTransformer'
import { Paper } from '@mui/material'

const BoxPlotByLocationChart = ({ data }: PedatChartsContainerProps) => {
  const option = transformBoxPlotByLocationTransformer(data || [])

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
