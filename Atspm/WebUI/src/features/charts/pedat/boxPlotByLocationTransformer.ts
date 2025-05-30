// /features/activeTransportation/transformers/boxPlotByLocation.ts
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
  return {
    title: {
      text: 'Box Plot of Pedestrian Volume, by Hour, by Location',
      left: 'center',
      top: 10,
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal',
      },
    },
    tooltip: {
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
    },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.locationId),
      name: 'Location',
    },
    yAxis: {
      type: 'value',
      name: 'Pedestrian Volume',
    },
    series: [
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
    ],
  }
}
