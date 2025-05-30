// /features/activeTransportation/transformers/hourlyPedVolByDayOfWeek.ts
import { EChartsOption } from 'echarts'

export interface DailyPedestrianVolume {
  day: string
  averageVolume: number
}

const dayOrder = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

export default function transformHourlyPedVolByDayOfWeekTransformer(
  data: DailyPedestrianVolume[]
): EChartsOption {
  // Ensure correct day order
  const sortedData = dayOrder.map(
    (day) => data.find((d) => d.day === day) ?? { day, averageVolume: 0 }
  )

  return {
    title: {
      text: 'Average Hourly Pedestrian Volume by Day of Week',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      name: 'Day',
      data: sortedData.map((d) => d.day),
    },
    yAxis: {
      type: 'value',
      name: 'Volume',
    },
    series: [
      {
        type: 'bar',
        name: 'Average Volume',
        data: sortedData.map((d) => d.averageVolume),
      },
    ],
  }
}
