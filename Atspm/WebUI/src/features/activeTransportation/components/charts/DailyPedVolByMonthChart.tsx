// /features/activeTransportation/components/charts/DailyPedVolByMonthChart.tsx
import { PedatChartsContainerProps } from '@/features/activeTransportation/components/pedatChartsContainer'
import ApacheEChart from '@/features/charts/components/apacheEChart'
import transformDailyPedVolByMonthTransformer from '@/features/charts/pedat/dailyPedVolByMonthTransformer'
import { Paper } from '@mui/material'

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const DailyPedVolByMonthChart = ({ data }: PedatChartsContainerProps) => {
  const combinedData = months?.map((month, monthIndex) => {
    const monthVolume =
      data
        ?.map(
          (loc) =>
            loc.averageVolumeByMonthOfYear?.find(
              (d) => d.index === monthIndex + 1
            )?.volume || 0
        )
        .reduce((a, b) => a + b, 0) || 0
    return { month, averageVolume: monthVolume }
  })

  const option = transformDailyPedVolByMonthTransformer(combinedData || [])

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
