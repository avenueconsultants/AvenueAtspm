// /features/activeTransportation/components/charts/HourlyPedVolByHourOfDayChart.tsx
import { PedatChartsContainerProps } from '@/features/activeTransportation/components/pedatChartsContainer'
import ApacheEChart from '@/features/charts/components/apacheEChart'
import transformHourlyPedVolByHourOfDay from '@/features/charts/pedat/avgHourlyPedVolByHour'
import { Paper } from '@mui/material'

const HourlyPedVolByHourOfDayChart = ({ data }: PedatChartsContainerProps) => {
  const combinedData = [...Array(23)].map((_, hour) => {
    const averageVolume = data
      ?.map((loc) => {
        return loc.averageVolumeByHourOfDay?.[hour]?.volume || 0
      })
      .reduce((a, b) => a + b, 0)

    const hourOfDay = hour + 1
    return { hour: hourOfDay, averageVolume: averageVolume || 0 }
  })

  const option = transformHourlyPedVolByHourOfDay(combinedData || [])
  return (
    <Paper sx={{ padding: '25px', mb: 5 }}>
      <ApacheEChart
        id="hourly-ped-vol-hour-of-day"
        option={option}
        style={{ width: '100%', height: '400px' }}
      />
    </Paper>
  )
}

export default HourlyPedVolByHourOfDayChart
