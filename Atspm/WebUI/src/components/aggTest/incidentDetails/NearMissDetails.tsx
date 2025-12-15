import {
  DetailProps,
  safeNum,
} from '@/components/aggTest/alertsPanel/AlertsDetailsList'
import { AlertDetailsHeader } from '@/components/aggTest/incidentDetails/AlertDetailsHeader'
import { Stack, Typography } from '@mui/material'

export function NearMissDetails({ e }: DetailProps) {
  const lead = e?.leading
  const trail = e?.trailing
  const obj = e?.object

  return (
    <>
      {' '}
      <AlertDetailsHeader
        name={'Illegal Movement'}
        timestamp={e?.lastUpdateMs ?? e?.timestamp}
        coordinates={obj?.position}
        type={e?.type}
      />
      <Stack spacing={0.75}>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          <b>Leading:</b> {String(lead?.type ?? '—')}
          &nbsp;·&nbsp;<b>Speed:</b> {safeNum(lead?.speed)?.toFixed(1) ?? '—'}{' '}
          m/s
        </Typography>

        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          <b>Trailing:</b> {String(trail?.type ?? '—')}
          &nbsp;·&nbsp;<b>Speed:</b> {safeNum(trail?.speed)?.toFixed(1) ?? '—'}{' '}
          m/s
        </Typography>
      </Stack>
    </>
  )
}
