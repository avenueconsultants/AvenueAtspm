// /features/activeTransportation/transformers/hourlyPedVolByHourOfDay.ts
import { EChartsOption } from 'echarts'

export interface HourlyPedestrianVolume {
  hour: number
  averageVolume: number
}

export default function transformHourlyPedVolByHourOfDay(
  data: HourlyPedestrianVolume[]
): EChartsOption {
  return {
    title: {
      text: 'Average Hourly Pedestrian Volume by Hour of Day',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = params[0]
        return `Hour: ${p.name}:00<br/>Volume: ${p.value}`
      },
    },
    xAxis: {
      type: 'category',
      name: 'Hour',
      data: data.map((d) => `${d.hour}`),
    },
    yAxis: {
      type: 'value',
      name: 'Volume',
    },
    series: [
      {
        type: 'bar',
        name: 'Average Volume',
        data: data.map((d) => d.averageVolume),
      },
    ],
  }
}
