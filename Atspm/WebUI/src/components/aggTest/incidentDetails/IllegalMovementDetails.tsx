import {
  DetailProps,
  safeNum,
} from '@/components/aggTest/alertsPanel/AlertsDetailsList'
import { AlertDetailsHeader } from '@/components/aggTest/incidentDetails/AlertDetailsHeader'
import { Chip, Stack, Typography } from '@mui/material'

export function IllegalMovementDetails({ e }: DetailProps) {
  const m = e?.movement
  const obj = e?.object

  return (
    <>
      <AlertDetailsHeader
        name={'Illegal Movement'}
        timestamp={e?.lastUpdateMs ?? e?.timestamp}
        coordinates={obj?.position}
      />
      <Stack spacing={0.75}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip
            size="small"
            label={`heading: ${String(m?.heading ?? '—')}`}
            variant="outlined"
          />
          <Chip
            size="small"
            label={`move: ${String(m?.type ?? '—')}`}
            variant="outlined"
          />
          <Chip
            size="small"
            label={`zone: ${String(m?.zone ?? '—')}`}
            variant="outlined"
          />
        </Stack>

        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          <b>Object:</b> {String(obj?.type ?? '—')} /{' '}
          {String(obj?.classification ?? '—')}
          &nbsp;·&nbsp;<b>Speed:</b> {safeNum(obj?.speed)?.toFixed(1) ?? '—'}{' '}
          m/s
        </Typography>

        <Typography variant="body2" sx={{ opacity: 0.85 }}>
          <b>LWH:</b>{' '}
          {Array.isArray(obj?.lwh)
            ? (obj.lwh as number[]).map((n: number) => n.toFixed(1)).join('×')
            : '—'}
          &nbsp;·&nbsp;<b>ID:</b>{' '}
          {Array.isArray(obj?.id) ? obj.id.join(',') : String(obj?.id ?? '—')}
        </Typography>
      </Stack>
    </>
  )
}
