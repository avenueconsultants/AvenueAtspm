// /features/activeTransportation/transformers/dailyPedVolByMonth.ts
import { EChartsOption } from 'echarts'

export interface MonthlyPedestrianVolume {
  month: string
  averageVolume: number
}

const monthOrder = [
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

export default function transformDailyPedVolByMonthTransformer(
  data: MonthlyPedestrianVolume[]
): EChartsOption {
  const sortedData = monthOrder.map(
    (month) =>
      data.find((d) => d.month === month) ?? { month, averageVolume: 0 }
  )

  return {
    title: {
      text: 'Average Daily Pedestrian Volume by Month of Year',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      name: 'Month',
      data: sortedData.map((d) => d.month),
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
