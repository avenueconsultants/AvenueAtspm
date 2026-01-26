import { Camera, useCameras } from '@/components/aggTest/hooks/useCameras'
import { Color } from '@/features/charts/utils'
import { createPinWithIcon } from '@/features/locations/utils'
import LinkIcon from '@mui/icons-material/Link'
import VideocamIcon from '@mui/icons-material/Videocam'
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined'
import {
  Box,
  Chip,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import type L from 'leaflet'
import { memo, useEffect, useMemo, useState } from 'react'
import { Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'

export function CameraPopup({ camera }: { camera: Camera }) {
  const views = camera.Views ?? []

  return (
    <Box sx={{ minWidth: 280, maxWidth: 420 }}>
      <Stack spacing={1}>
        {/* Header */}
        <Box>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 800, lineHeight: 1.2 }}
          >
            {camera.Location}
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 0.75, flexWrap: 'wrap' }}
          >
            <Chip size="small" label={camera.Roadway || 'Unknown'} />
            <Chip size="small" label={camera.Direction || 'Unknown'} />
          </Stack>
        </Box>

        <Divider />

        {/* Source row (same line) */}
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
          <Typography variant="body2">
            <b>Source:</b> {camera.Source || '—'}
          </Typography>
          <Typography variant="body2">
            <b>SourceId:</b> {camera.SourceId || '—'}
          </Typography>
        </Stack>

        <Divider />

        {/* Views */}
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Views
          </Typography>

          {views.length ? (
            <Stack spacing={0.75} sx={{ mt: 0.75 }}>
              {views.map((v) => (
                <Stack
                  key={`view-${v.Id}`}
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ minWidth: 0 }}
                  >
                    <VideocamOutlinedIcon fontSize="small" />
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={v.Description || `View ${v.Id}`}
                    >
                      {v.Description || `View ${v.Id}`}
                    </Typography>

                    <Chip
                      size="small"
                      label={v.Status || 'Unknown'}
                      variant="outlined"
                    />
                  </Stack>

                  {v.Url ? (
                    <Tooltip title="Open view">
                      <IconButton
                        size="small"
                        component="a"
                        href={v.Url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <LinkIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </Stack>
              ))}
            </Stack>
          ) : (
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', mt: 0.5 }}
            >
              No views
            </Typography>
          )}
        </Box>
      </Stack>
    </Box>
  )
}

function CameraLayer() {
  const { data: cameras } = useCameras()
  const [icon, setIcon] = useState<L.DivIcon | null>(null)

  useEffect(() => {
    let mounted = true
    getCameraPinIcon().then((i) => mounted && setIcon(i))
    return () => {
      mounted = false
    }
  }, [])

  const items = useMemo(() => cameras ?? [], [cameras])

  if (!icon) return null

  return (
    <MarkerClusterGroup chunkedLoading disableClusteringAtZoom={14}>
      {items.map((camera) => (
        <Marker
          key={`camera-${camera.Id}`}
          position={[camera.Latitude, camera.Longitude]}
          icon={icon}
        >
          <Popup pane="popups" maxWidth={420} offset={[0, -20]} closeButton>
            <CameraPopup camera={camera} />
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  )
}

export default memo(CameraLayer)

let cached: Promise<L.DivIcon> | null = null

export function getCameraPinIcon(): Promise<L.DivIcon> {
  if (!cached) {
    cached = createPinWithIcon({
      color: Color.Blue,
      MuiIcon: VideocamIcon,
      iconSize: 18,
      offset: 0,
      scale: 0.8,
    })
  }
  return cached
}
