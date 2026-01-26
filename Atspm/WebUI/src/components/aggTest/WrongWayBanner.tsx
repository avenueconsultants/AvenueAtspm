import CloseIcon from '@mui/icons-material/Close'
import MyLocationIcon from '@mui/icons-material/MyLocation'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'

export type SourcePayload = Record<string, unknown>

export type AlertPayload = {
  id: number
  code: number
  message: string
  locationIdentifier: string
  url?: string | null
  tenantId?: string
  timestampUtc: string
  severity: string | number
  category?: string | null
  sourcePayload?: SourcePayload | null
  type?: string | null
}

type LatLng = { lat: number; lng: number }

type SourceLogEntry = {
  timestamp?: number
  position?: [number, number, number?] | [number, number]
}

type SourcePayloadLite = {
  log?: SourceLogEntry[]
  position?: [number, number, number?] | [number, number]
}

function isSev10(severity: AlertPayload['severity']) {
  if (typeof severity === 'number') return severity === 10
  if (typeof severity === 'string') return Number(severity) === 10
  return false
}

function isLatLng(x: unknown): x is [number, number] {
  return (
    Array.isArray(x) &&
    x.length >= 2 &&
    typeof x[0] === 'number' &&
    typeof x[1] === 'number'
  )
}

function getAlertLatLng(a: AlertPayload): LatLng | null {
  const sp = a.sourcePayload as unknown as SourcePayloadLite | null
  const pos =
    sp?.log?.at?.(-1)?.position ?? sp?.position ?? sp?.log?.[0]?.position

  if (!isLatLng(pos)) return null
  return { lat: pos[0], lng: pos[1] }
}

function fmtUtc(ts?: string) {
  if (!ts) return '—'
  const t = Date.parse(ts)
  if (!Number.isFinite(t)) return ts
  return new Date(t).toLocaleString()
}

export function WrongWayBanner({
  alert,
  onClose,
  onJump,
}: {
  alert: AlertPayload | null
  onClose: () => void
  onJump: (ll: LatLng, alertKey: string) => void
}) {
  const open = !!alert && isSev10(alert.severity)
  if (!open || !alert) return null

  const ll = getAlertLatLng(alert)
  const alertKey = `sev10-wrongway-${alert.id}-${alert.timestampUtc}`

  return (
    <Box
      sx={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 16,
        zIndex: 3000,
        px: 2,
        pointerEvents: 'none',
      }}
    >
      <Box sx={{ maxWidth: 980, mx: 'auto', pointerEvents: 'auto' }}>
        <Alert
          severity="error"
          variant="filled"
          sx={{
            borderRadius: 2,
            boxShadow: 8,
            alignItems: 'center',
            py: 0.75,
          }}
          action={
            <Stack direction="row" spacing={1} alignItems="center">
              {/* Jump to: text + icon */}
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                startIcon={<MyLocationIcon fontSize="small" />}
                disabled={!ll}
                onClick={() => ll && onJump(ll, alertKey)}
                sx={{
                  borderColor: 'rgba(255,255,255,0.65)',
                  color: 'inherit',
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.85)',
                  },
                }}
              >
                Jump to
              </Button>

              {alert.url ? (
                <Tooltip title="Open video/details">
                  <IconButton
                    size="small"
                    component={Link as any}
                    href={alert.url}
                    target="_blank"
                    rel="noreferrer"
                    sx={{ color: 'inherit' }}
                    aria-label="Open video/details"
                  >
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}

              <Tooltip title="Dismiss">
                <IconButton
                  size="small"
                  onClick={onClose}
                  sx={{ color: 'inherit' }}
                  aria-label="Dismiss"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          }
        >
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              sx={{ minWidth: 0 }}
            >
              <Typography fontWeight={900} sx={{ lineHeight: 1.1 }} noWrap>
                Wrong-way • {alert.locationIdentifier}
              </Typography>

              <Chip
                size="small"
                label="SEV 10"
                variant="outlined"
                sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.6)' }}
              />

              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                {fmtUtc(alert.timestampUtc)}
              </Typography>
            </Stack>

            <Typography variant="body2" sx={{ opacity: 0.95 }}>
              {alert.message}
            </Typography>
          </Stack>
        </Alert>
      </Box>
    </Box>
  )
}
