// components/aggTest/HeatmapOverlay.tsx
import { HeatmapChart } from 'echarts/charts'
import { GridComponent, VisualMapComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useEffect, useMemo, useRef } from 'react'
import { useMap } from 'react-leaflet'
echarts.use([HeatmapChart, GridComponent, VisualMapComponent, CanvasRenderer])

type Loc = { id: string; lat: number; lng: number }

export default function HeatmapOverlay({
  locations,
  volumes,
  cols = 80,
  rows = 50,
}: {
  locations: Loc[]
  volumes: Record<string, number>
  cols?: number
  rows?: number
}) {
  const map = useMap()
  const holderRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.EChartsType | null>(null)

  const pts = useMemo(
    () =>
      locations
        .map((l) => ({ ...l, v: volumes[l.id] }))
        .filter((x) => Number.isFinite(x.v)),
    [locations, volumes]
  )

  useEffect(() => {
    const pane = map.getPane('echarts')
    if (!pane) return
    const div = document.createElement('div')
    div.style.position = 'absolute'
    div.style.inset = '0'
    div.style.pointerEvents = 'none'
    pane.appendChild(div)
    holderRef.current = div
    chartRef.current = echarts.init(div, undefined, { renderer: 'canvas' })
    ;(chartRef.current.getDom() as HTMLDivElement).style.pointerEvents = 'none'
    return () => {
      chartRef.current?.dispose()
      chartRef.current = null
      holderRef.current = null
      pane.removeChild(div)
    }
  }, [map])

  useEffect(() => {
    const div = holderRef.current
    const chart = chartRef.current
    if (!div || !chart) return

    const update = () => {
      const size = map.getSize()
      if (!size.x || !size.y) return // map not laid out yet

      const width = size.x
      const height = size.y

      div.style.width = width + 'px'
      div.style.height = height + 'px'

      const cellW = width / cols
      const cellH = height / rows
      const grid: number[][] = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => 0)
      )

      for (const p of pts) {
        const pt = map.latLngToContainerPoint([p.lat, p.lng])
        const cx = Math.floor(pt.x / cellW)
        const cy = Math.floor(pt.y / cellH)
        if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
          grid[cy][cx] += Number(p.v || 0)
        }
      }

      const data: [number, number, number][] = []
      let max = 0
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const val = grid[y][x]
          max = Math.max(max, val)
          data.push([x, y, val])
        }
      }

      chart.setOption({
        backgroundColor: 'transparent',
        animation: false,
        grid: { left: 0, right: 0, top: 0, bottom: 0 },
        xAxis: {
          type: 'category',
          data: Array.from({ length: cols }, (_, i) => i),
          boundaryGap: true,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: false },
          splitLine: { show: false },
        },
        yAxis: {
          type: 'category',
          data: Array.from({ length: rows }, (_, i) => i),
          boundaryGap: true,
          inverse: true,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: false },
          splitLine: { show: false },
        },
        visualMap: {
          show: false,
          min: 0,
          max: Math.max(1, max),
          inRange: {
            color: [
              '#f7fbff',
              '#deebf7',
              '#9ecae1',
              '#6baed6',
              '#3182bd',
              '#08519c',
            ],
          },
        },
        series: [
          {
            type: 'heatmap',
            data,
            progressive: 0,
            silent: true,
            emphasis: { disabled: true },
          },
        ],
      })
    }

    // initial draw + keep in sync with map changes
    update()
    map.on('resize', update)
    map.on('moveend', update)
    map.on('zoomend', update)

    return () => {
      map.off('resize', update)
      map.off('moveend', update)
      map.off('zoomend', update)
    }
  }, [map, pts, cols, rows])

  // useEffect(() => {
  //   const onChange = () => {
  //     const ev = new Event('resize')
  //     window.dispatchEvent(ev)
  //   }
  //   map.on('moveend zoomend resize', onChange)
  //   return () => map.off('moveend zoomend resize', onChange)
  // }, [map])

  return null
}
