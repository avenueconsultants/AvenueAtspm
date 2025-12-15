import { DetailProps } from '@/components/aggTest/alertsPanel/AlertsDetailsList'
import { Stack, Typography } from '@mui/material'

export function GenericDetails({ e }: DetailProps) {
  const keys = Object.keys(e ?? {}).filter(
    (k) => !['log', 'movements'].includes(k)
  )
  return (
    <Stack spacing={0.75}>
      {keys.slice(0, 10).map((k) => (
        <Typography key={k} variant="body2" sx={{ opacity: 0.9 }}>
          <b>{k}:</b>{' '}
          {typeof e[k] === 'object' ? JSON.stringify(e[k]) : String(e[k])}
        </Typography>
      ))}
      {Array.isArray(e?.log) ? (
        <Typography variant="body2" sx={{ opacity: 0.85 }}>
          <b>log points:</b> {e.log.length}
        </Typography>
      ) : null}
      {Array.isArray(e?.movements) ? (
        <Typography variant="body2" sx={{ opacity: 0.85 }}>
          <b>movements:</b> {e.movements.length}
        </Typography>
      ) : null}
    </Stack>
  )
}
