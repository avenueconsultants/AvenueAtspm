import {
  DetailProps,
  safeNum,
} from '@/components/aggTest/alertsPanel/AlertsDetailsList'
import { Chip, Stack, Typography } from '@mui/material'

export function RedLightDetails({ e }: DetailProps) {
  const m = e?.movement
  const obj = e?.object

  const movements = (e?.movements ?? []) as Array<{
    heading: string
    type: string
    indication: string
    state: string
    duration: number
  }>

  const interesting = movements
    .filter((x) => x.heading === m?.heading && x.type === m?.type)
    .slice(0, 3)

  return (
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
          label={`certainty: ${String(m?.certainty ?? '—')}`}
          variant="outlined"
        />
        <Chip
          size="small"
          label={`ppt: ${String(m?.ppt ?? '—')} ms`}
          variant="outlined"
        />
      </Stack>

      <Typography variant="body2" sx={{ opacity: 0.9 }}>
        <b>Object:</b> {String(obj?.type ?? '—')} /{' '}
        {String(obj?.classification ?? '—')}
        &nbsp;·&nbsp;<b>Speed:</b> {safeNum(obj?.speed)?.toFixed(1) ?? '—'} m/s
      </Typography>

      {interesting.length ? (
        <Stack spacing={0.5}>
          {interesting.map((x, idx) => (
            <Stack
              key={idx}
              direction="row"
              spacing={1}
              flexWrap="wrap"
              alignItems="center"
            >
              <Chip size="small" label={`${x.indication}`} variant="outlined" />
              <Chip size="small" label={`${x.state}`} variant="outlined" />
              <Chip
                size="small"
                label={`dur ${String(x.duration)}ms`}
                variant="outlined"
              />
            </Stack>
          ))}
        </Stack>
      ) : null}
    </Stack>
  )
}
