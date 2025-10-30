// components/EChartsFlowOverlay.tsx
import * as echarts from 'echarts'
import type { LatLngLiteral } from 'leaflet'
import { useEffect, useMemo, useRef } from 'react'
import { useMap } from 'react-leaflet'

type Flow = { from: LatLngLiteral; to: LatLngLiteral; value?: number }

export default function EChartsFlowOverlay({
  flows,
  zIndex = 650, // above markers, under popups
  stroke = 'rgba(0,0,0,0.5)',
}: {
  flows: Flow[]
  zIndex?: number
  stroke?: string
}) {
  const map = useMap()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.EChartsType | null>(null)
  const size = useMemo(() => map.getSize(), [map])

  // create & attach an absolutely-positioned overlay div in the overlayPane
  useEffect(() => {
    const pane = map.getPanes().overlayPane
    const div = document.createElement('div')
    div.style.position = 'absolute'
    div.style.left = '0'
    div.style.top = '0'
    div.style.width = `${size.x}px`
    div.style.height = `${size.y}px`
    div.style.pointerEvents = 'none'
    div.style.zIndex = String(zIndex)
    pane.appendChild(div)
    containerRef.current = div

    const chart = echarts.init(div, undefined, { renderer: 'canvas' })
    chartRef.current = chart

    const handleResize = () => {
      const s = map.getSize()
      div.style.width = `${s.x}px`
      div.style.height = `${s.y}px`
      chart.resize()
      render()
    }

    const render = () => {
      if (!chartRef.current) return
      const graphics: echarts.GraphicComponentElementOption[] = []

      for (const f of flows) {
        const p1 = map.latLngToLayerPoint(f.from)
        const p2 = map.latLngToLayerPoint(f.to)

        // simple straight line; replace with curved bezier if desired
        graphics.push({
          type: 'polyline',
          shape: {
            points: [
              [p1.x, p1.y],
              [p2.x, p2.y],
            ],
          },
          style: {
            stroke,
            lineWidth: Math.max(1, Math.min(6, (f.value ?? 1) / 50 + 1)),
            opacity: 0.8,
          },
          silent: true,
        })

        // moving head (tiny animated dot)
        graphics.push({
          type: 'circle',
          shape: { cx: p1.x, cy: p1.y, r: 2.5 },
          style: { fill: stroke },
          keyframeAnimation: {
            duration: 1200,
            loop: true,
            keyframes: [
              { percent: 0, style: { cx: p1.x, cy: p1.y, opacity: 0.0 } },
              { percent: 0.1, style: { opacity: 1.0 } },
              { percent: 1, style: { cx: p2.x, cy: p2.y, opacity: 0.0 } },
            ],
          },
          silent: true,
        })
      }

      chartRef.current.setOption(
        {
          animation: true,
          animationDuration: 300,
          animationEasing: 'linear',
          graphic: graphics,
        },
        { notMerge: true, lazyUpdate: true }
      )
    }

    const onMove = () => render()
    const onZoom = () => render()

    map.on('move', onMove)
    map.on('zoom', onZoom)
    map.on('resize', handleResize)

    render()

    return () => {
      map.off('move', onMove)
      map.off('zoom', onZoom)
      map.off('resize', handleResize)
      chartRef.current?.dispose()
      chartRef.current = null
      pane.removeChild(div)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, size.x, size.y, zIndex, stroke, flows])

  return null
}
