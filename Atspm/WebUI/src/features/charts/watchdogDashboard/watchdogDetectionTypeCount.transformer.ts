import { DetectionTypeCount } from '@/features/watchdog/types'
import { EChartsOption } from 'echarts'

const transformDetectionTypeCountData = (
  data: DetectionTypeCount[]
): EChartsOption => {
  const total = data.reduce((sum, item) => sum + item.count, 0)
  const seriesData = data.map((item) => ({
    value: item.count,
    name: item.id,
  }))

  return {
    title: {
      text: 'Detection Type Count',
      left: 'center',
      top: 5,
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      top: "25%",
      right: 5,
      itemWidth: 26,
      itemHeight: 15,
      textStyle: {
        fontSize: 13,
      },
    },
    series: [
      {
        name: 'Detection Type',
        type: 'pie',
        radius: '80%',
        center: ['35%', '60%'],
        data: seriesData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        label: {
          show: true,
          formatter: (params: any) => {
            const percent = ((params.value / total) * 100).toFixed(1)
            return `${params.name}\n${params.value} (${percent}%)`
          },
          position: 'inside',
        },
      },
    ],
    media: [
      {
        query: { maxWidth: 600 },
        option: {
          legend: {
            orient: 'horizontal',
            top: 'bottom',
            left: 'center',
            right: 'auto',
          },
          series: [
            {
              radius: '60%',
              center: ['50%', '50%'],
            },
          ],
        },
      },
    ],
  }
}

export default transformDetectionTypeCountData