import { ActiveEventGroup } from '@/components/aggTest/alertsPanel/AlertsContainer'
import { AlertDetailsHeader } from '@/components/aggTest/incidentDetails/AlertDetailsHeader'
import { Box, Chip, Stack } from '@mui/material'

type SourceLogEntry = {
  speed?: number
  state?: string
  timestamp?: number
}

type SourcePayloadLite = {
  log?: SourceLogEntry[]
}

const pickLatestEvent = (events: ActiveEventGroup['events']) => {
  if (!events?.length) return null
  return events.reduce((best, cur) => {
    const bt = Date.parse(best.timestampUtc)
    const ct = Date.parse(cur.timestampUtc)
    if (!Number.isFinite(bt)) return cur
    if (!Number.isFinite(ct)) return best
    return ct >= bt ? cur : best
  }, events[0])
}

const getAllLogs = (events: ActiveEventGroup['events']): SourceLogEntry[] => {
  const merged: SourceLogEntry[] = []
  for (const ev of events ?? []) {
    const sp = ev.sourcePayload as unknown as SourcePayloadLite | null
    const log = sp?.log
    if (Array.isArray(log)) merged.push(...log)
  }
  const key = (x: SourceLogEntry) =>
    `${String(x.timestamp ?? '')}|${String(x.state ?? '')}|${String(x.speed ?? '')}`
  const seen = new Set<string>()
  const uniq: SourceLogEntry[] = []
  for (const x of merged) {
    const k = key(x)
    if (seen.has(k)) continue
    seen.add(k)
    uniq.push(x)
  }
  uniq.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
  return uniq
}

const lastLogEntry = (logs: SourceLogEntry[]) =>
  logs.length ? logs[logs.length - 1] : null

const formatDuration = (ms: number) => {
  if (!Number.isFinite(ms) || ms < 0) return '—'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rs = s % 60
  if (m < 60) return `${m}m ${rs}s`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return `${h}h ${rm}m`
}

export function WrongWayDetails({ e }: { e: ActiveEventGroup }) {
  const latest = pickLatestEvent(e.events)
  const logs = getAllLogs(e.events)
  const last = lastLogEntry(logs)

  const title = latest?.locationIdentifier ?? '—'

  const state = last?.state ?? 'unknown'

  const speedMph = last?.speed

  const startTs = logs.find((x) => typeof x.timestamp === 'number')?.timestamp
  const endTs =
    state.includes('lost') && last?.timestamp != null
      ? last.timestamp
      : Date.now()

  const durationMs =
    typeof startTs === 'number' && Number.isFinite(startTs)
      ? endTs - startTs
      : NaN

  const headerTs = Date.parse(e.lastUpdateUtc)
  const headerTimestamp = Number.isFinite(headerTs) ? headerTs : undefined

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <AlertDetailsHeader
        name={title}
        timestamp={headerTimestamp}
        coordinates={undefined}
      />

      <Stack spacing={0.75}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip size="small" label={state} variant="outlined" />
          <Chip
            size="small"
            label={`tracked: ${formatDuration(durationMs)}`}
            variant="outlined"
          />
          {speedMph != null && (
            <Chip
              size="small"
              label={`${speedMph.toFixed(1)} mph`}
              variant="outlined"
            />
          )}
        </Stack>
      </Stack>
    </Box>
  )
}
