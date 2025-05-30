// /features/activeTransportation/transformers/timeSeriesByHourByLocation.ts
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
    stack: 'total', // Remove this line if you want bars to overlay, not stack
    barWidth: '100%',
    emphasis: {
      focus: 'series',
    },
    data: location.data.map((d) => d.volume),
  }))

  return {
    title: {
      text: 'Time Series of Pedestrian Volume, by Hour, by Location',
      left: 'center',
      top: 10,
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal',
      },
    },
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      bottom: 0,
    },
    dataZoom: [
      { type: 'slider', start: 0, end: 100 },
      { type: 'inside', start: 0, end: 100 },
    ],
    xAxis: {
      type: 'category',
      name: 'Time',
      data: timestamps,
      axisLabel: {
        formatter: (value: string) => value.split(' ')[0],
      },
    },
    yAxis: {
      type: 'value',
      name: 'Pedestrian Volume',
    },
    series,
  }
}
