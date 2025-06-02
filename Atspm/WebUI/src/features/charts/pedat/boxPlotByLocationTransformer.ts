// /features/activeTransportation/transformers/boxPlotByLocation.ts
import {
  createGrid,
  createLegend,
  createToolbox,
  createTooltip,
} from '@/features/charts/common/transformers'
import { EChartsOption } from 'echarts'

export interface BoxPlotStats {
  count: number
  mean: number
  stdDev: number
  min: number
  q1: number
  median: number
  q3: number
  max: number
  missing: number
}

export interface BoxPlotByLocation {
  locationId: string
  stats: BoxPlotStats
}

export default function transformBoxPlotByLocationTransformer(
  data: BoxPlotByLocation[]
): EChartsOption {
  const title = {
    text: 'Box Plot of Pedestrian Volume, by Hour, by Location',
    left: 'center',
  }

  const xAxis = {
    type: 'category',
    name: 'Location',
    data: data.map((d) => d.locationId),
  }

  const yAxis = {
    type: 'value',
    name: 'Pedestrian Volume',
  }

  const grid = createGrid({ top: 80, left: 60, right: 190, bottom: 60 })

  const legend = createLegend({
    data: ['Volume Distribution'],
  })

  const toolbox = createToolbox(
    { title: 'Box Plot by Location', dateRange: '' },
    '',
    'basic'
  )

  const tooltip = createTooltip({
    trigger: 'item',
    formatter: (params: any) => {
      const [min, q1, median, q3, max] = params.data.slice(1)
      return `
        <strong>${params.name}</strong><br/>
        Min: ${min}<br/>
        Q1: ${q1}<br/>
        Median: ${median}<br/>
        Q3: ${q3}<br/>
        Max: ${max}
      `
    },
  })

  const series = [
    {
      name: 'Volume Distribution',
      type: 'boxplot',
      data: data.map((d) => [
        d.locationId,
        d.stats.min,
        d.stats.q1,
        d.stats.median,
        d.stats.q3,
        d.stats.max,
      ]),
    },
  ]

  const chartOptions: EChartsOption = {
    title,
    xAxis,
    yAxis,
    grid,
    legend,
    toolbox,
    tooltip,
    series,
  }

  return chartOptions
}
