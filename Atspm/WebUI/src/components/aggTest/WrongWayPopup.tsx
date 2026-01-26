import { AlertPayload } from '@/components/aggTest/hooks/useAlertsHub'
import {
  Box,
  Button,
  Chip,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material'

export type SourcePayload = Record<string, unknown>

type SourceLogEntry = {
  speed?: number
  state?: string
  timestamp?: number
  position?: [number, number, number?] | [number, number]
}

type SourcePayloadLite = {
  detector?: number
  id?: number
  type?: string
  timestamp?: number
  log?: SourceLogEntry[]
  position?: [number, number, number?] | [number, number]
}

function isSev10(severity: AlertPayload['severity']) {
  if (typeof severity === 'number') return severity === 10
  if (typeof severity === 'string') return Number(severity) === 10
  return false
}

function pickLatestLog(sp?: SourcePayload | null) {
  const payload = sp as unknown as SourcePayloadLite | null
  const log = payload?.log
  if (!Array.isArray(log) || !log.length) return null

  let best: SourceLogEntry | null = null
  for (const x of log) {
    const ts = typeof x?.timestamp === 'number' ? x.timestamp : -Infinity
    if (!best) best = x
    else {
      const bt = typeof best.timestamp === 'number' ? best.timestamp : -Infinity
      if (ts >= bt) best = x
    }
  }
  return best
}

function fmtUtc(ts?: string) {
  if (!ts) return '—'
  const t = Date.parse(ts)
  if (!Number.isFinite(t)) return ts
  return new Date(t).toLocaleString()
}

export function WrongWayPopup({
  alert,
  onClose,
}: {
  alert: AlertPayload | null
  onClose: () => void
}) {
  const open = !!alert && isSev10(alert.severity)
  if (!open || !alert) return null

  const sp = alert.sourcePayload ?? null
  const latestLog = pickLatestLog(sp)

  const state = latestLog?.state ?? '—'
  const speed = typeof latestLog?.speed === 'number' ? latestLog.speed : null
  const pos = latestLog?.position ?? (sp as any)?.position

  const lat =
    Array.isArray(pos) && typeof pos[0] === 'number' ? Number(pos[0]) : null
  const lng =
    Array.isArray(pos) && typeof pos[1] === 'number' ? Number(pos[1]) : null

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 3000,
        pointerEvents: 'none',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(560px, calc(100% - 32px))',
          pointerEvents: 'auto',
        }}
      >
        <Paper elevation={14} sx={{ p: 2, borderRadius: 2 }}>
          <Stack spacing={1.25}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
            >
              <Chip size="small" label="WRONG-WAY" color="error" />
              <Chip
                size="small"
                label="SEVERITY 10"
                color="error"
                variant="outlined"
              />
              {state !== '—' && (
                <Chip
                  size="small"
                  label={state}
                  variant="outlined"
                  color={state === 'tracking' ? 'info' : 'default'}
                />
              )}
              {speed != null && (
                <Chip
                  size="small"
                  label={`${speed.toFixed(1)} mph`}
                  variant="outlined"
                />
              )}
            </Stack>

            <Typography fontWeight={900} sx={{ lineHeight: 1.1 }}>
              {alert.locationIdentifier}
            </Typography>

            <Typography variant="body2">{alert.message}</Typography>

            <Stack spacing={0.5}>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Time: <b>{fmtUtc(alert.timestampUtc)}</b>
              </Typography>
              {lat != null && lng != null && (
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Coords:{' '}
                  <b>
                    {lat.toFixed(6)}, {lng.toFixed(6)}
                  </b>
                </Typography>
              )}
              {alert.type && (
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Type: <b>{alert.type}</b>
                </Typography>
              )}
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                Code: <b>{alert.code}</b> &nbsp;•&nbsp; Alert ID:{' '}
                <b>{alert.id}</b>
              </Typography>
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              justifyContent="space-between"
              alignItems="center"
            >
              {alert.url ? (
                <Link
                  href={alert.url}
                  target="_blank"
                  rel="noreferrer"
                  underline="hover"
                >
                  Open video/details
                </Link>
              ) : (
                <span />
              )}

              <Button size="small" variant="contained" onClick={onClose}>
                Dismiss
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    </Box>
  )
}
