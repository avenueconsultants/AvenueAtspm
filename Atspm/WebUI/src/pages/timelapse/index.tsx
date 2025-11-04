// pages/ExamplePage.tsx
import SpeedTimelapseChart from '@/components/arizona/SpeedTimelapse'
import { geojson } from '@/components/arizona/arizona'
import routes from '@/components/arizona/routes.json'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  Switch,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

type RouteRow = {
  Date: string
  Epoch: string
  osm_id: number | string
  'Avg Speed': number | string
}

const parseMDY = (mdy: string) => {
  const [m, d, y] = mdy.split('/').map((x) => Number(x))
  return new Date(y, m - 1, d)
}
const fmtNice = (d: string) =>
  parseMDY(d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
const monthKey = (d: string) => {
  const dt = parseMDY(d)
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  return `${dt.getFullYear()}-${mm}`
}
const monthNice = (key: string) => {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

const ExamplePage = () => {
  const allRoutes = routes as unknown as RouteRow[]

  // Per-segment max observed speed across the whole dataset
  const maxSpeedBySegment = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of allRoutes) {
      const id = String(r.osm_id)
      const v = Number(r['Avg Speed'])
      if (!Number.isFinite(v)) continue
      const prev = m.get(id)
      if (prev === undefined || v > prev) m.set(id, v)
    }
    return m
  }, [allRoutes])

  const grouped = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const r of allRoutes) {
      const mk = monthKey(r.Date)
      if (!map.has(mk)) map.set(mk, [])
      const arr = map.get(mk)!
      if (!arr.includes(r.Date)) arr.push(r.Date)
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => parseMDY(a).getTime() - parseMDY(b).getTime())
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [allRoutes])

  const [month, setMonth] = useState<string>(grouped[0]?.[0] ?? '')
  const days = useMemo(
    () => grouped.find(([k]) => k === month)?.[1] ?? [],
    [grouped, month]
  )
  const [day, setDay] = useState<string>(days[0] ?? '')

  useEffect(() => {
    if (!month && grouped.length) setMonth(grouped[0][0])
  }, [grouped, month])

  useEffect(() => {
    if (!day && days.length) setDay(days[0])
  }, [days, day])

  const onChangeMonth = (m: string) => {
    setMonth(m)
    const nextDays = grouped.find(([k]) => k === m)?.[1] ?? []
    setDay(nextDays[0] ?? '')
  }

  const dayRoutes = useMemo(
    () => (day ? allRoutes.filter((r) => r.Date === day) : []),
    [allRoutes, day]
  )

  // NEW: normalize toggle
  const [normalizeData, setNormalizeData] = useState(false)

  // When normalized, convert each row's Avg Speed to % of that segment's max observed speed
  const displayRoutes = useMemo(() => {
    if (!normalizeData) return dayRoutes
    return dayRoutes.map((r) => {
      const id = String(r.osm_id)
      const current = Number(r['Avg Speed'])
      const max = maxSpeedBySegment.get(id)
      const pct =
        Number.isFinite(current) && max && max > 0 ? (current / max) * 100 : 0
      return {
        ...r,
        // Overwrite the value the chart reads; the chart can switch its axis/legend when normalizeData is true
        'Avg Speed': pct,
      }
    })
  }, [dayRoutes, normalizeData, maxSpeedBySegment])

  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true)
  const [autoPlayMs, setAutoPlayMs] = useState<number>(1200)

  return (
    <Box sx={{ p: 2, maxWidth: 1200, margin: 'auto' }}>
      <Card
        variant="outlined"
        sx={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
      >
        <CardContent sx={{ py: 4 }}>
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            flexWrap="wrap"
          >
            <Typography variant="subtitle2">Filters</Typography>

            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="month-label">Month</InputLabel>
              <Select
                labelId="month-label"
                label="Month"
                value={month}
                onChange={(e) => onChangeMonth(e.target.value)}
              >
                {grouped.map(([k]) => (
                  <MenuItem key={k} value={k}>
                    {monthNice(k)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="day-label">Day</InputLabel>
              <Select
                labelId="day-label"
                label="Day"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              >
                {days.map((d) => (
                  <MenuItem key={d} value={d}>
                    {fmtNice(d)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box display={'flex'} flexDirection={'column'}>
              <FormControlLabel
                control={
                  <Switch
                    checked={normalizeData}
                    onChange={(e) => setNormalizeData(e.target.checked)}
                    size="small"
                  />
                }
                label="Normalize data"
                sx={{ ml: 2 }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={autoPlayEnabled}
                    onChange={(e) => setAutoPlayEnabled(e.target.checked)}
                    size="small"
                  />
                }
                label="Autoplay"
                sx={{ ml: 2 }}
              />
            </Box>
            <Stack
              direction="row"
              alignItems="center"
              spacing={2}
              sx={{ minWidth: 360 }}
            >
              <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                Speed
              </Typography>
              <Slider
                size="small"
                min={100}
                max={4000}
                step={100}
                value={autoPlayMs}
                onChange={(_, v) => setAutoPlayMs(v as number)}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${v} ms/frame`}
                marks={[
                  { value: 4000, label: 'slow' },
                  { value: 100, label: 'fast' },
                ]}
                sx={{ width: 260 }}
                disabled={!autoPlayEnabled}
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card
        variant="outlined"
        sx={{
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          overflow: 'hidden',
        }}
      >
        <CardHeader
          title="Speed Timelapse"
          subheader={
            day
              ? `${fmtNice(day)}${normalizeData ? ' • normalized (0–100%)' : ''}`
              : ''
          }
          sx={{ pb: 0.5 }}
        />
        <Divider />
        <CardContent sx={{ p: 0 }}>
          <SpeedTimelapseChart
            geojson={geojson as any}
            routes={displayRoutes as any}
            subtext={day ? fmtNice(day) : ''}
            autoPlayMs={autoPlayMs}
            autoPlayEnabled={autoPlayEnabled}
            height={640}
            normalizeData={normalizeData} // <-- let the chart adjust axis/legend/color scale
          />
        </CardContent>
      </Card>
    </Box>
  )
}

;(ExamplePage as any).noLayout = true
export default ExamplePage
