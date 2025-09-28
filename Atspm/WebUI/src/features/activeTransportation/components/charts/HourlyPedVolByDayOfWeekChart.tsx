// /features/activeTransportation/components/charts/HourlyPedVolByDayOfWeekChart.tsx
import { PedatChartsContainerProps } from '@/features/activeTransportation/components/pedatChartsContainer'
import ApacheEChart from '@/features/charts/components/apacheEChart'
import transformHourlyPedVolByDayOfWeekTransformer from '@/features/charts/pedat/hourlyPedVolByDayOfWeekTransformer'
import { Paper } from '@mui/material'

const dayOrder = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

const HourlyPedVolByDayOfWeekChart = ({ data }: PedatChartsContainerProps) => {
  const combinedData = dayOrder.map((day, i) => {
    const dayVolume =
      data
        ?.map(
          (loc) =>
            loc.averageVolumeByDayOfWeek?.find((d) => d.index === i)?.volume ||
            0
        )
        .reduce((a, b) => a + b, 0) || 0

    return { day, averageVolume: dayVolume }
  })
  const option = transformHourlyPedVolByDayOfWeekTransformer(combinedData || [])

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
