import { applyPrintMode } from '@/features/activeTransportation/components/charts/utils'
import { PedatChartsContainerProps } from '@/features/activeTransportation/components/pedatChartsContainer'
import ApacheEChart from '@/features/charts/components/apacheEChart'
import timeSeriesByHourByLocationTransformer from '@/features/charts/pedat/timeSeriesByHourByLocationTransformer'
import { Paper } from '@mui/material'
import { useMemo } from 'react'

const TimeSeriesByHourByLocationChart = ({
  data,
  printMode,
}: PedatChartsContainerProps) => {
  const base = timeSeriesByHourByLocationTransformer(data || [])

  const option = useMemo(
    () => applyPrintMode(base, !!printMode),
    [base, printMode]
  )

  return (
    <Paper sx={{ padding: '25px', mb: 5 }}>
      <ApacheEChart
        id="ped-vol-time-series-hour"
        option={option}
        style={{ width: '100%', height: '400px' }}
      />
    </Paper>
  )
}

export default TimeSeriesByHourByLocationChart
