// /features/activeTransportation/transformers/dailyPedVolByMonth.ts
import {
  createDataZoom,
  createGrid,
  createLegend,
  createToolbox,
  createTooltip,
} from '@/features/charts/common/transformers'
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

  const title = {
    text: 'Average Daily Pedestrian Volume by Month of Year',
    left: 'center',
  }

  const xAxis = {
    type: 'category',
    name: 'Month',
    data: sortedData.map((d) => d.month),
  }

  const yAxis = {
    type: 'value',
    name: 'Volume',
  }

  const grid = createGrid({ top: 80, left: 60, right: 190, bottom: 60 })

  const legend = createLegend({
    data: ['Average Hourly Volume'],
  })

  const dataZoom = createDataZoom()

  const toolbox = createToolbox(
    { title: 'Monthly Pedestrian Volume', dateRange: '' },
    '',
    'basic'
  )

  const tooltip = createTooltip()

  const series = [
    {
      type: 'bar',
      name: 'Average Hourly Volume',
      data: sortedData.map((d) => d.averageVolume),
    },
  ]

  const chartOptions: EChartsOption = {
    title,
    xAxis,
    yAxis,
    grid,
    legend,
    dataZoom,
    toolbox,
    tooltip,
    series,
  }

  return chartOptions
}
