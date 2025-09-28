// PedatChartsContainer.tsx
import { PedatLocationData } from '@/api/reports'
import BoxPlotByLocationChart from '@/features/activeTransportation/components/charts/BoxPlotByLocationChart'
import { Box, Button, Tab, Tabs } from '@mui/material'
import { useState } from 'react'
import AverageDailyPedVolByLocationChart from './charts/AverageDailyPedVolByLocationChart'
import DailyPedVolByMonthChart from './charts/DailyPedVolByMonthChart'
import HourlyPedVolByDayOfWeekChart from './charts/HourlyPedVolByDayOfWeekChart'
import HourlyPedVolByHourOfDayChart from './charts/HourlyPedVolByHourOfDayChart'
import TimeSeriesByHourByLocationChart from './charts/TimeSeriesByHourByLocationChart'
import TotalPedVolByLocationCharts from './charts/TotalPedVolByLocationCharts'
import DescriptiveStatsByHourByLocationChart from './DescriptiveStatsByHourByLocationChart'
import PedatMapContainer from './PedatMapContainer'
import PedestrianVolumeTimeSeriesTable from './PedestrianVolumeTimeSeriesTable'

export interface PedatChartsContainerProps {
  data?: PedatLocationData[]
}

/* ---------------- CSV helpers ---------------- */
function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ---------------- Build "raw data" CSV (table columns) ---------------- */
function buildRawCsv(data?: PedatLocationData[]): string {
  const header = [
    'Signal ID',
    'Address',
    'Timestamp',
    'Count',
    'City',
    'Latitude',
    'Longitude',
  ]
  const rows: string[] = [header.join(',')]
  if (!data?.length) return rows.join('\r\n')

  for (const loc of data) {
    const signalId = loc.locationIdentifier ?? ''
    const address = loc.names ?? ''
    const city = (loc.areas ?? '').split(',')[0]?.trim() || loc.areas || ''
    const lat = Number.isFinite(loc.latitude)
      ? (loc.latitude as number).toFixed(6)
      : ''
    const lng = Number.isFinite(loc.longitude)
      ? (loc.longitude as number).toFixed(6)
      : ''
    for (const pt of loc.rawData ?? []) {
      const ts = (pt as any).timestamp ?? (pt as any).timeStamp
      if (!ts) continue
      const timestamp = new Date(ts).toISOString()
      const count = (pt as any).pedestrianCount ?? ''
      rows.push(
        [
          escapeCsv(signalId),
          escapeCsv(address),
          escapeCsv(timestamp),
          escapeCsv(count),
          escapeCsv(city),
          escapeCsv(lat),
          escapeCsv(lng),
        ].join(',')
      )
    }
  }
  return rows.join('\r\n')
}

/* ---------------- Build "statistics" CSV (stats table columns) ---------------- */
function percentile(values: number[], p: number) {
  if (!values.length) return 0
  const a = [...values].sort((x, y) => x - y)
  const idx = (a.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return a[lo]
  const t = idx - lo
  return a[lo] * (1 - t) + a[hi] * t
}

function buildStatsCsv(data?: PedatLocationData[]): string {
  const header = [
    'Signal ID',
    'count',
    'mean',
    'std',
    'min',
    '25%',
    '50%',
    '75%',
    'max',
    'Missing Count',
  ]
  const rows: string[] = [header.join(',')]
  if (!data?.length) return rows.join('\r\n')

  for (const loc of data) {
    const id = loc.locationIdentifier ?? ''
    const s = (loc as any).statisticData

    let count: number,
      mean: number,
      std: number,
      min: number,
      q1: number,
      med: number,
      q3: number,
      max: number,
      missing = 0

    if (s) {
      count = Number(s.count ?? 0)
      mean = Number(s.mean ?? 0)
      std = Number(s.std ?? 0)
      min = Number(s.min ?? 0)
      q1 = Number(s.twentyFifthPercentile ?? s['25'] ?? 0)
      med = Number(s.fiftyithPercentile ?? s.fiftiethPercentile ?? s['50'] ?? 0)
      q3 = Number(s.seventyFifthPercentile ?? s['75'] ?? 0)
      max = Number(s.max ?? 0)
      missing = Number(s.missingCount ?? 0)
    } else {
      // Fallback: compute from rawData if statisticData is absent
      const vals =
        (loc.rawData ?? [])
          .map((r: any) => Number(r.pedestrianCount))
          .filter((v) => Number.isFinite(v)) || []
      const n = vals.length
      const sum = vals.reduce((a, b) => a + b, 0)
      const mu = n ? sum / n : 0
      const variance = n ? vals.reduce((a, b) => a + (b - mu) ** 2, 0) / n : 0
      count = sum
      mean = mu
      std = Math.sqrt(variance)
      min = n ? Math.min(...vals) : 0
      max = n ? Math.max(...vals) : 0
      q1 = percentile(vals, 0.25)
      med = percentile(vals, 0.5)
      q3 = percentile(vals, 0.75)
      missing = 0
    }

    rows.push(
      [escapeCsv(id), count, mean, std, min, q1, med, q3, max, missing].join(
        ','
      )
    )
  }

  return rows.join('\r\n')
}

const PedatChartsContainer = ({ data }: PedatChartsContainerProps) => {
  const [tabIndex, setTabIndex] = useState(0)

  const handleDownloadRaw = () => {
    const csv = buildRawCsv(data)
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`pedestrian_time_series_${stamp}.csv`, csv)
  }

  const handleDownloadStats = () => {
    const csv = buildStatsCsv(data)
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`pedestrian_statistics_${stamp}.csv`, csv)
  }

  return (
    <Box>
      <Tabs value={tabIndex} onChange={(_, val) => setTabIndex(val)}>
        <Tab label="Averages" />
        <Tab label="Figures" />
        <Tab label="Map" />
        <Tab label="Data" />
      </Tabs>

      {tabIndex === 0 && (
        <Box sx={{ mb: 2 }}>
          <AverageDailyPedVolByLocationChart data={data} />
          <HourlyPedVolByHourOfDayChart data={data} />
          <HourlyPedVolByDayOfWeekChart data={data} />
          <DailyPedVolByMonthChart data={data} />
        </Box>
      )}

      {tabIndex === 1 && (
        <Box sx={{ mb: 4 }}>
          <TotalPedVolByLocationCharts data={data} />
          <TimeSeriesByHourByLocationChart data={data} />
          <BoxPlotByLocationChart data={data} />
        </Box>
      )}

      {tabIndex === 2 && (
        <Box sx={{ mb: 4 }}>
          <PedatMapContainer data={data} />
        </Box>
      )}

      {tabIndex === 3 && (
        <Box sx={{ mb: 4 }}>
          <PedestrianVolumeTimeSeriesTable data={data} />
          <DescriptiveStatsByHourByLocationChart data={data} />
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="contained" onClick={handleDownloadRaw}>
          Download Data
        </Button>
        <Button variant="contained" onClick={handleDownloadStats}>
          Download Statistics
        </Button>
        <Button variant="contained">Generate Report</Button>
      </Box>
    </Box>
  )
}

export default PedatChartsContainer
