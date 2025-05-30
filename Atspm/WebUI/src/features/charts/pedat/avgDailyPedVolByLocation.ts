// /features/activeTransportation/transformers/avgDailyPedVolByLocation.ts
import { EChartsOption } from 'echarts'

export interface PedestrianVolumeByLocation {
  locationId: string
  locationName: string
  averageDailyVolume: number
}

export default function transformAvgDailyPedVolByLocation(
  data: PedestrianVolumeByLocation[]
): EChartsOption {
  return {
    title: {
      text: 'Average Daily Pedestrian Volume by Location',
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.locationName),
      name: 'Location',
    },
    yAxis: {
      type: 'value',
      name: 'Volume',
    },
    series: [
      {
        type: 'bar',
        data: data.map((d) => d.averageDailyVolume),
        name: 'Average Daily Volume',
      },
    ],
  }
}
