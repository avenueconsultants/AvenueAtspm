import {
  OverheadDigitalSign,
  useOverheadDigitalSigns,
} from '@/components/aggTest/hooks/useOverheadDigitalSigns'
import { Color } from '@/features/charts/utils'
import { createPinWithIcon } from '@/features/locations/utils'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import SignpostOutlinedIcon from '@mui/icons-material/Wysiwyg'
import { Box, Button, Chip, Divider, Stack, Typography } from '@mui/material'
import type L from 'leaflet'
import { memo, useEffect, useMemo, useState } from 'react'
import { Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'

const convertUnixTimestampToDateString = (ms: number) =>
  new Date(Math.floor(ms * 1000)).toLocaleString()

function OverheadSignPopup({
  sign,
  onQuickAlertWrongWay,
}: {
  sign: OverheadDigitalSign
  onQuickAlertWrongWay?: (sign: OverheadDigitalSign) => void
}) {
  const lastUpdated = convertUnixTimestampToDateString(Number(sign.LastUpdated))

  return (
    <Box sx={{ minWidth: 260, maxWidth: 360 }}>
      <Stack spacing={1}>
        <Box>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, lineHeight: 1.2 }}
          >
            {sign.Name}
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 0.75, flexWrap: 'wrap' }}
          >
            <Chip size="small" label={sign.Roadway} />
            <Chip size="small" label={sign.DirectionOfTravel} />
          </Stack>
        </Box>

        <Divider />

        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Messages
          </Typography>

          {sign.Messages?.length ? (
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
              {sign.Messages.map((m, i) => (
                <Typography
                  key={`${sign.Id}-msg-${i}`}
                  variant="body2"
                  sx={{ whiteSpace: 'pre-wrap' }}
                >
                  • {m}
                </Typography>
              ))}
            </Stack>
          ) : (
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', mt: 0.5 }}
            >
              No messages
            </Typography>
          )}
        </Box>

        <Divider />

        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Last updated: {lastUpdated ?? '—'}
        </Typography>

        <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
          <Button
            size="small"
            variant="contained"
            color="error"
            startIcon={<ErrorOutlineIcon />}
            onClick={() => onQuickAlertWrongWay?.(sign)}
          >
            Wrong way driver
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}

function OverheadSignLayer({
  onQuickAlertWrongWay,
}: {
  onQuickAlertWrongWay?: (sign: OverheadDigitalSign) => void
}) {
  const { data: overheadSigns } = useOverheadDigitalSigns()
  const [icon, setIcon] = useState<L.DivIcon | null>(null)

  useEffect(() => {
    let mounted = true
    getOverheadSignPinIcon().then((i) => mounted && setIcon(i))
    return () => {
      mounted = false
    }
  }, [])

  const signs = useMemo(() => overheadSigns ?? [], [overheadSigns])

  if (!icon) return null

  return (
    <MarkerClusterGroup chunkedLoading disableClusteringAtZoom={14}>
      {signs.map((sign) => (
        <Marker
          key={`overheadSign-${sign.Id}`}
          position={[sign.Latitude, sign.Longitude]}
          icon={icon}
        >
          <Popup pane="popups" maxWidth={420} offset={[0, -20]} closeButton>
            <OverheadSignPopup
              sign={sign}
              onQuickAlertWrongWay={onQuickAlertWrongWay}
            />
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  )
}

export default memo(OverheadSignLayer)

let cached: Promise<L.DivIcon> | null = null

export function getOverheadSignPinIcon(): Promise<L.DivIcon> {
  if (!cached) {
    cached = createPinWithIcon({
      color: Color.Green,
      MuiIcon: SignpostOutlinedIcon,
      iconSize: 18,
      offset: 0,
      scale: 0.8,
    })
  }
  return cached
}
