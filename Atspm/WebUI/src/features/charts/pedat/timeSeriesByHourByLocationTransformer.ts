// /features/activeTransportation/transformers/timeSeriesByHourByLocation.ts
import {
  createDataZoom,
  createGrid,
  createLegend,
  createToolbox,
  createTooltip,
} from '@/features/charts/common/transformers'
import { EChartsOption } from 'echarts'

export interface TimeSeriesEntry {
  timestamp: string
  volume: number
}

export interface TimeSeriesByLocation {
  locationId: string
  data: TimeSeriesEntry[]
}

export default function timeSeriesByHourByLocationTransformer(
  data: TimeSeriesByLocation[]
): EChartsOption {
  const timestamps = data[0]?.data.map((d) => d.timestamp) || []

  const series = data.map((location) => ({
    name: location.locationId,
    type: 'bar',
    stack: 'total',
    barWidth: '100%',
    emphasis: {
      focus: 'series',
    },
    data: location.data.map((d) => d.volume),
  }))

  const title = {
    text: 'Time Series of Pedestrian Volume, by Hour, by Location',
    left: 'center',
  }

  const xAxis = {
    type: 'category',
    name: 'Time',
    data: timestamps,
    axisLabel: {
      formatter: (value: string) => value.split(' ')[0],
    },
  }

  const yAxis = {
    type: 'value',
    name: 'Pedestrian Volume',
  }

  const grid = createGrid({ top: 80, left: 60, right: 190, bottom: 80 })

  const legend = createLegend({
    bottom: 0,
    right: 80,
    data: data.map((d) => d.locationId),
  })

  const dataZoom = createDataZoom()

  const toolbox = createToolbox(
    { title: 'Hourly Pedestrian Time Series', dateRange: '' },
    '',
    'basic'
  )

  const tooltip = createTooltip({
    trigger: 'axis',
  })

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
