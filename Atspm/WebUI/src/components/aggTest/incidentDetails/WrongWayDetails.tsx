import {
  DetailProps,
  safeNum,
} from '@/components/aggTest/alertsPanel/AlertsDetailsList'
import { AlertDetailsHeader } from '@/components/aggTest/incidentDetails/AlertDetailsHeader'
import { Chip, Stack, Typography } from '@mui/material'

const avg = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0

export function WrongWayDetails({ e }: DetailProps) {
  const log = (e?.log ?? []) as Array<{
    speed: number
    state: string
    timestamp: number
  }>
  const last = log.length ? log[log.length - 1] : null

  const speeds = log.map((x) => safeNum(x.speed) ?? 0).filter((n) => n > 0)
  const avgSpeed = avg(speeds)
  const maxSpeed = speeds.length ? Math.max(...speeds) : 0

  const stateNow = e?.latestEntry?.state ?? last?.state ?? 'unknown'

  return (
    <>
      <AlertDetailsHeader
        name={'Illegal Movement'}
        timestamp={e?.lastUpdateMs ?? e?.timestamp}
        coordinates={e?.object?.position}
      />
      <Stack spacing={0.75}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip
            size="small"
            label={`state: ${String(stateNow)}`}
            variant="outlined"
          />
          <Chip
            size="small"
            label={`points: ${log.length}`}
            variant="outlined"
          />
          <Chip
            size="small"
            label={`avg: ${avgSpeed.toFixed(1)} m/s`}
            variant="outlined"
          />
          <Chip
            size="small"
            label={`max: ${maxSpeed.toFixed(1)} m/s`}
            variant="outlined"
          />
        </Stack>

        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          <b>Object:</b> {String(e?.object?.type ?? '—')} /{' '}
          {String(e?.object?.classification ?? '—')}
        </Typography>

        <Typography variant="body2" sx={{ opacity: 0.85 }}>
          <b>LWH:</b>{' '}
          {Array.isArray(e?.object?.lwh)
            ? (e.object.lwh as number[]).map((n) => n.toFixed(1)).join('×')
            : '—'}
          &nbsp;·&nbsp;<b>ID:</b>{' '}
          {Array.isArray(e?.object?.id)
            ? e.object.id.join(',')
            : String(e?.object?.id ?? '—')}
        </Typography>
      </Stack>
    </>
  )
}
