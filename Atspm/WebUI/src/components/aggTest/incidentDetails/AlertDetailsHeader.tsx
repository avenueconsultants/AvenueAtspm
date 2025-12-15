import MyLocationIcon from '@mui/icons-material/MyLocation'
import { Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material'

const fmtTime = (ms?: number) => {
  if (!ms) return '—'
  try {
    return new Date(ms).toLocaleString()
  } catch {
    return String(ms)
  }
}

export function AlertDetailsHeader({
  name,
  timestamp,
  coordinates,
  onFlyTo,
  type,
}: {
  name: string
  timestamp?: number
  coordinates?: [number, number]
  severity?: { label: string; tone: 'error' | 'warning' | 'success' | 'info' }
  type?: string
  onFlyTo?: (req: AlertFlyTo) => void
}) {
  const when = fmtTime(timestamp)

  const color = 'error'

  const flyReq =
    onFlyTo && coordinates
      ? { lat: coordinates[0], lng: coordinates[1], zoom: 17 }
      : null
  const canFly = !!flyReq
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="flex-start"
      justifyContent="space-between"
    >
      {/* left */}
      <Stack spacing={0.25} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Typography fontWeight={500} sx={{ lineHeight: 1.1 }}>
            {name}
          </Typography>

          {onFlyTo ? (
            <Tooltip title={canFly ? 'Jump to' : 'No location'}>
              <span>
                <IconButton
                  size="small"
                  disabled={!canFly}
                  onClick={() => flyReq && onFlyTo(flyReq)}
                  sx={{ p: 0.25 }}
                  aria-label="Jump to"
                >
                  <MyLocationIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          ) : null}
        </Stack>

        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          {when}
        </Typography>
      </Stack>

      {/* right */}
      {type ? (
        <Chip size="small" label={type} color={color} variant="filled" />
      ) : null}
    </Stack>
  )
}
