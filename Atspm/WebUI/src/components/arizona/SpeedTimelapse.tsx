// SpeedTimelapseLocal.tsx
import type { ECharts, EChartsOption } from 'echarts'
import * as echarts from 'echarts'
import { useEffect, useMemo, useRef } from 'react'

type LineStringFC = GeoJSON.FeatureCollection<GeoJSON.LineString>
type RouteRow = {
  Date: string
  Epoch: string
  osm_id: number | string
  'Avg Speed': number | string
}

type Props = {
  geojson: LineStringFC
  routes: RouteRow[]
  title?: string
  autoPlayMs?: number
  autoPlayEnabled?: boolean
  height?: number | string
  style?: React.CSSProperties
}

const toKey = (v: number | string | null | undefined) => String(v ?? '').trim()
const makeKeyAndLabel = (dateStr: string, timeStr: string) => {
  const d = new Date(`${dateStr} ${timeStr}`)
  return { key: d.getTime(), label: `${dateStr} ${timeStr}` }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const rgb = (r: number, g: number, b: number) =>
  `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`
const colorBetween = (
  c1: [number, number, number],
  c2: [number, number, number],
  t: number
) => rgb(lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t))

// max color at 70, but clamp color plateau at >=50 to green
const colorRamp = (v: number) => {
  if (!Number.isFinite(v) || v <= 0) return '#000000'
  if (v >= 50) return 'rgb(0,255,0)'
  const minV = 1
  const maxColorV = 50
  const t = Math.max(0, Math.min(1, (v - minV) / (maxColorV - minV)))
  const stops: [number, [number, number, number]][] = [
    [0, [255, 0, 0]], // red
    [1 / 3, [255, 165, 0]], // orange
    [2 / 3, [255, 255, 0]], // yellow
    [1, [0, 255, 0]], // green at 50
  ]
  let i = 0
  while (i < stops.length - 1 && t > stops[i + 1][0]) i++
  const [t1, c1] = stops[i]
  const [t2, c2] = stops[i + 1]
  const localT = (t - t1) / (t2 - t1)
  return colorBetween(c1, c2, localT)
}

const onlyTimeFromLabel = (label: string) => {
  const m = label.match(/\b(\d{1,2}:\d{2}(?::\d{2})?\s?(AM|PM)?)$/i)
  if (m) return m[1]
  const parts = label.split(/\s+/)
  return parts[1] ?? label
}

export default function SpeedTimelapseLocal({
  geojson,
  routes,
  title = 'Segment Timelapse',
  autoPlayMs,
  autoPlayEnabled = true,
  height = 640,
  style,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const chart = useRef<ECharts | null>(null)

  const geomByOsmId = useMemo(() => {
    const idx: Record<string, [number, number][]> = {}
    for (const f of geojson.features) {
      if (f.geometry?.type !== 'LineString') continue
      const props = (f.properties || {}) as Record<string, any>
      const id = toKey(props.osm_id ?? props.osm_id1)
      if (!id) continue
      const coords = (f.geometry.coordinates || []) as number[][]
      if (coords.length >= 2) idx[id] = coords.map(([lng, lat]) => [lng, lat])
    }
    return idx
  }, [geojson])

  const option = useMemo(() => {
    const byTime: Record<
      number,
      {
        label: string
        items: {
          coords: [number, number][]
          value: number
          segmentId: string
          timeLabel: string
        }[]
      }
    > = {}
    for (const r of routes) {
      const segId = toKey(r.osm_id)
      const coords = geomByOsmId[segId]
      if (!coords) continue
      const v = Number(r['Avg Speed'])
      if (!Number.isFinite(v)) continue
      const { key, label } = makeKeyAndLabel(r.Date, r.Epoch)
      if (!byTime[key]) byTime[key] = { label, items: [] }
      byTime[key].items.push({
        coords,
        value: v,
        segmentId: segId,
        timeLabel: label,
      })
    }

    const keys = Object.keys(byTime)
      .map(Number)
      .sort((a, b) => a - b)
    const times = keys.map((k) => byTime[k].label)
    const frames = keys.map((k) =>
      byTime[k].items.map((d) => ({
        coords: d.coords,
        value: d.value,
        name: d.segmentId,
        segmentId: d.segmentId,
        timeLabel: d.timeLabel,
        lineStyle: { color: colorRamp(d.value), width: 3, opacity: 0.95 },
      }))
    )

    const step = Math.ceil(times.length / 6) || 1
    const TL_TOP = 60
    const TL_HEIGHT = 48
    const TL_PAD = 8

    const baseOption: EChartsOption = {
      backgroundColor: '#ffffff',
      title: {
        text: title,
        left: 'center',
        top: 8,
        backgroundColor: '#ffffff',
        padding: [6, 10],
        z: 1200,
      },
      graphic: [
        {
          type: 'rect',
          left: 0,
          right: 0,
          top: TL_TOP - TL_PAD,
          height: TL_HEIGHT + TL_PAD * 2,
          z: 1095,
          zlevel: 4,
          silent: true,
          shape: { x: 0, y: 0, width: 0, height: TL_HEIGHT + TL_PAD * 2 },
          style: { fill: '#ffffff' },
        },
      ],
      tooltip: {
        trigger: 'item',
        confine: true,
        formatter: (p: any) => {
          const seg = p?.data?.segmentId ?? p?.name ?? ''
          const val = p?.data?.value
          const t = p?.data?.timeLabel
          return `<b>${seg}</b><br/>${t ?? ''}<br/>Avg Speed: ${val ?? '—'}`
        },
      },
      timeline: {
        axisType: 'category',
        data: times,
        autoPlay: autoPlayEnabled,
        playInterval: autoPlayMs,
        loop: false,
        symbol: 'none',
        top: TL_TOP,
        height: TL_HEIGHT,
        backgroundColor: '#ffffff',
        padding: [8, 12],
        z: 1100,
        zlevel: 5,
        label: {
          show: true,
          interval: (idx: number) => idx % step === 0,
          formatter: (val: string) => onlyTimeFromLabel(val),
        },
      },
      geo: {
        map: 'arizona-lines',
        roam: true,
        silent: true,
        label: { show: false },
        top: 300,
        itemStyle: {
          areaColor: '#f3f4f6',
          borderColor: '#e5e7eb',
          borderWidth: 0.75,
        },
        center: [-112.1151369, 33.6808654],
        zoom: 12,
        emphasis: { disabled: true },
      },
      visualMap: {
        min: 1,
        max: 70,
        right: 18,
        bottom: 36,
        text: ['speed (mph)'],
        inRange: { color: ['#ff0000', '#ffa500', '#ffff00', '#00ff00'] },
        calculable: true,
        formatter: (v: number) => `${Math.round(v)}`,
      },
    }

    const options = frames.map(
      (frame, i): EChartsOption => ({
        title: { subtext: times[i] },
        series: [
          {
            type: 'lines',
            coordinateSystem: 'geo',
            polyline: true,
            data: frame,
            z: 2,
            progressive: 3000,
            progressiveThreshold: 8000,
            progressiveChunkMode: 'mod',
            effect: { show: false },
            lineStyle: { width: 3, opacity: 0.95 },
            animation: false,
          },
        ],
        animation: false,
      })
    )

    return { baseOption, options } as EChartsOption
  }, [routes, geomByOsmId, title, autoPlayMs, autoPlayEnabled])

  useEffect(() => {
    if (!ref.current) return
    if (!chart.current) {
      chart.current = echarts.init(ref.current, undefined, {
        useDirtyRect: true,
      })
      echarts.registerMap('arizona-lines', geojson as any)
    }
    chart.current.setOption(option as any, { notMerge: true })
    const onResize = () => chart.current && chart.current.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.current?.dispose()
      chart.current = null
    }
  }, [geojson, option])

  return <div ref={ref} style={{ width: '100%', height, ...style }} />
}
