import 'leaflet/dist/leaflet.css'
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
  subtext?: string
  autoPlayEnabled?: boolean
  autoPlayMs?: number
  height?: number | string
  style?: React.CSSProperties
}

const baseLmap = {
  center: [-112.07525, 33.681667],
  zoom: 12,
  resizeEnable: true,
  renderOnMoving: true,
  echartsLayerInteractive: true,
  largeMode: false,
}

// helpers
const toKey = (v: unknown) => String(v ?? '').trim()
const makeKeyAndLabel = (dateStr: string, timeStr: string) => {
  const d = new Date(`${dateStr} ${timeStr}`)
  return { key: d.getTime(), label: `${dateStr} ${timeStr}` }
}
const colorFor = (v: number) => {
  if (!Number.isFinite(v) || v <= 0) return '#000'
  if (v >= 50) return '#00ff00'
  const t = Math.max(0, Math.min(1, (v - 1) / (50 - 1)))
  const r = Math.round(255 * (1 - t))
  const g = Math.round(255 * t)
  return `rgb(${r},${g},0)`
}

const onlyTimeFromLabel = (label: string) => {
  const m = label.match(/\b(\d{1,2}:\d{2}(?::\d{2})?\s?(AM|PM)?)$/i)
  if (m) return m[1]
  const parts = label.split(/\s+/)
  return parts[1] ?? label
}

export default function SpeedTimelapse({
  geojson,
  routes,
  subtext,
  autoPlayEnabled = true,
  autoPlayMs = 1200,
  height = 640,
  style,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)

  // geometry index: keep [lng, lat] (the lmap plugin converts internally)
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

  // build timeline frames
  const { times, frames } = useMemo(() => {
    const byTime: Record<
      number,
      {
        coords: [number, number][]
        value: number
        id: string
        timeLabel: string
      }[]
    > = {}

    for (const r of routes) {
      const id = toKey(r.osm_id)
      const coords = geomByOsmId[id]
      if (!coords) continue
      const v = Number(r['Avg Speed'])
      if (!Number.isFinite(v)) continue
      const { key, label } = makeKeyAndLabel(r.Date, r.Epoch)
      ;(byTime[key] ||= []).push({ coords, value: v, id, timeLabel: label })
    }

    const keys = Object.keys(byTime)
      .map(Number)
      .sort((a, b) => a - b)
    const times = keys.map((k) => byTime[k][0].timeLabel)
    const frames = keys.map((k) =>
      byTime[k].map((d) => ({
        coords: d.coords, // [lng, lat] polyline path
        value: d.value,
        name: d.id,
        segmentId: d.id,
        timeLabel: d.timeLabel,
        lineStyle: { color: colorFor(d.value), width: 3, opacity: 0.95 },
      }))
    )
    return { times, frames }
  }, [routes, geomByOsmId])

  useEffect(() => {
    let disposed = false
    let chart: any | null = null

    ;(async () => {
      // ECharts + Leaflet on demand
      const ecMod = await import('echarts')
      const echarts: any = (ecMod as any).default || ecMod

      const lfMod = await import('leaflet')
      const L: any = (lfMod as any).default || lfMod
      const { tileLayer: LtileLayer } = L

      // Register the Leaflet extension (scoped package)
      const plug = await import('@joakimono/echarts-extension-leaflet')
      const install =
        (plug as any).install ||
        (plug as any).default ||
        (plug as any).registerLeaflet
      if (typeof install === 'function') {
        try {
          install(echarts, L)
        } catch {
          install(echarts)
        }
      }

      if (disposed || !hostRef.current) return

      // init echart
      chart = echarts.init(hostRef.current, undefined, { useDirtyRect: true })

      // timeline + lmap option (follows your working pattern)
      const step = Math.ceil((times.length || 1) / 6) || 1
      const option = {
        // Leaflet map config via lmap (note: center is [lng, lat])
        lmap: baseLmap,
        title: {
          z: 33,
          text: 'Timelapse',
          subtext,
          left: 'center',
          top: 8,
        },
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
        graphic: [
          {
            type: 'group',
            top: 0,
            left: 'center',
            onclick: (e: any) => {
              e.event.stopPropagation()
            },
            children: [
              {
                type: 'rect',
                z: 20,
                shape: {
                  width: 740,
                  height: 140,
                },
                style: {
                  fill: '#ffffff',
                },
              },
            ],
          },
        ],
        timeline: {
          axisType: 'category',
          data: times,
          autoPlay: !!autoPlayEnabled,
          playInterval: autoPlayMs,
          loop: false,
          symbol: 'none',
          top: 56,
          height: 44,
          z: 33,
          label: {
            show: true,
            interval: (i: number) => i % step === 0,
            formatter: (s: string) => onlyTimeFromLabel(s),
          },
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
        options: frames.map((frame, i) => ({
          title: { subtext: times[i] },
          series: [
            {
              type: 'lines',
              coordinateSystem: 'lmap', // <<< key change
              polyline: true,
              data: frame,
              lineStyle: { width: 3, opacity: 0.95 },
              animation: false,
              z: 2,
              progressive: 3000,
              progressiveThreshold: 8000,
              progressiveChunkMode: 'mod',
            },
          ],
          animation: false,
        })),
      } as any

      chart.setOption(option, { notMerge: true })

      // access Leaflet instance and add Esri Topo tiles (exact pattern you liked)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const lmapComponent = chart.getModel().getComponent('lmap')
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const lmap = lmapComponent.getLeaflet()

      LtileLayer(
        'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
        {
          attribution: '',
          maxZoom: 19,
          center: [-110.07525, 30.681667],
        }
      ).addTo(lmap)

      const hostEl = hostRef.current
      const PANEL_WIDTH = 740
      const PANEL_HEIGHT = 140
      const PANEL_TOP = 0 // same as graphic.top

      let onPointerDown: ((e: PointerEvent) => void) | undefined
      let onPointerUpOrCancel: ((e: PointerEvent) => void) | undefined
      let onWheel: ((e: WheelEvent) => void) | undefined

      if (hostEl) {
        const inTimelapsePanel = (clientX: number, clientY: number) => {
          const rect = hostEl.getBoundingClientRect()

          const localX = clientX - rect.left
          const localY = clientY - rect.top

          const panelLeft = (rect.width - PANEL_WIDTH) / 2 // left: 'center'
          const panelRight = panelLeft + PANEL_WIDTH
          const panelTop = PANEL_TOP
          const panelBottom = PANEL_TOP + PANEL_HEIGHT

          return (
            localX >= panelLeft &&
            localX <= panelRight &&
            localY >= panelTop &&
            localY <= panelBottom
          )
        }

        onPointerDown = (e: PointerEvent) => {
          if (inTimelapsePanel(e.clientX, e.clientY)) {
            // pointer interacting with timelapse UI: freeze map drag
            lmap.dragging.disable()
          } else {
            lmap.dragging.enable()
          }
        }

        onPointerUpOrCancel = () => {
          // when interaction ends, restore map dragging
          lmap.dragging.enable()
        }

        onWheel = (e: WheelEvent) => {
          if (inTimelapsePanel(e.clientX, e.clientY)) {
            // allow ECharts wheel, block Leaflet zoom
            e.preventDefault()
            e.stopPropagation()
          }
        }

        hostEl.addEventListener('pointerdown', onPointerDown)
        hostEl.addEventListener('pointerup', onPointerUpOrCancel)
        hostEl.addEventListener('pointercancel', onPointerUpOrCancel)
        hostEl.addEventListener('pointerleave', onPointerUpOrCancel)
        hostEl.addEventListener('wheel', onWheel, { passive: false })
      }
      const onResize = () => chart && chart.resize()
      window.addEventListener('resize', onResize)

      lmap.setView

      const cleanup = () => {
        window.removeEventListener('resize', onResize)

        if (hostEl) {
          if (onPointerDown)
            hostEl.removeEventListener('pointerdown', onPointerDown)
          if (onPointerUpOrCancel) {
            hostEl.removeEventListener('pointerup', onPointerUpOrCancel)
            hostEl.removeEventListener('pointercancel', onPointerUpOrCancel)
            hostEl.removeEventListener('pointerleave', onPointerUpOrCancel)
          }
          if (onWheel) hostEl.removeEventListener('wheel', onWheel)
        }

        if (chart) {
          chart.dispose()
          chart = null
        }
      }

      if (disposed) cleanup()
      else return cleanup
    })()

    return () => {
      disposed = true
    }
  }, [autoPlayEnabled, autoPlayMs, subtext, frames, times])

  return <div ref={hostRef} style={{ width: '100%', height, ...style }} />
}
