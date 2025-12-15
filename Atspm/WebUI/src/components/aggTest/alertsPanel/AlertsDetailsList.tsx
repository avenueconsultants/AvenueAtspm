import { GenericDetails } from '@/components/aggTest/incidentDetails/GenericDetails'
import { IllegalMovementDetails } from '@/components/aggTest/incidentDetails/IllegalMovementDetails'
import { NearMissDetails } from '@/components/aggTest/incidentDetails/NearMissDetails'
import { RedLightDetails } from '@/components/aggTest/incidentDetails/RedLightDetails'
import { WrongWayDetails } from '@/components/aggTest/incidentDetails/WrongWayDetails'
import { AlertEvent } from '@/components/aggTest/useAlertsHubMock'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Box, Chip, IconButton, List, Stack, Typography } from '@mui/material'
import { useMemo } from 'react'

type NormalizedIncident = AlertEvent & {
  type: string
  lastUpdateMs?: number
  latestEntry?: { state: string; timestamp: number }
}

export type DetailProps = { e: any }

export const safeNum = (v: any) =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined

const eventKey = (e: any) =>
  `${String(e?.type ?? 'unknown')}:${String(e?.id ?? 'noid')}`

function flyReqFromIncident(e: any): AlertFlyTo | null {
  const t = String(e?.type ?? '')

  // choose best coordinate per event
  const pos =
    t === 'intersection.near-miss'
      ? e?.intersect
      : t === 'object.wrong-way'
        ? e?.log?.[e?.log?.length - 1]?.position
        : e?.object?.position

  if (!Array.isArray(pos) || pos.length < 2) return null
  const [lat, lng] = pos

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  return { lat, lng, zoom: 17 } as any
}

function AlertDetailsByType({ e }: { e: any }) {
  const t = String(e?.type ?? 'unknown')
  switch (t) {
    case 'object.wrong-way':
      return <WrongWayDetails e={e} />
    case 'intersection.near-miss':
      return <NearMissDetails e={e} />
    case 'intersection.illegal-movement':
      return <IllegalMovementDetails e={e} />
    case 'intersection.red-light':
      return <RedLightDetails e={e} />
    default:
      return <GenericDetails e={e} />
  }
}

export default function AlertDetailsPanel({
  type,
  label,
  incidents,
  onBack,
  onFlyTo,
}: {
  type: string
  label: string
  incidents: NormalizedIncident[]
  onBack: () => void
  onFlyTo?: (req: AlertFlyTo) => void
}) {
  const ordered = useMemo(() => {
    const copy = [...incidents]
    copy.sort((a: any, b: any) => {
      const ta = (a?.lastUpdateMs ?? a?.timestamp ?? 0) as number
      const tb = (b?.lastUpdateMs ?? b?.timestamp ?? 0) as number
      return tb - ta
    })
    return copy
  }, [incidents])

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ minWidth: 0 }}
          >
            <IconButton size="small" onClick={onBack} aria-label="Back">
              <ArrowBackIcon fontSize="small" />
            </IconButton>

            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={800} sx={{ lineHeight: 1.15 }} noWrap>
                {label}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }} noWrap>
                {type}
              </Typography>
            </Box>
          </Stack>

          <Chip size="small" label={`${incidents.length}`} variant="outlined" />
        </Stack>

        <Typography variant="caption" sx={{ display: 'block', mt: 0.75 }}>
          Newest first
        </Typography>
      </Box>

      {/* body */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List disablePadding>
          {ordered.map((e: any) => {
            const key = eventKey(e)
            return (
              <Box
                key={key}
                sx={{
                  px: 2,
                  py: 1.5,
                  borderTop: '1px solid',
                  borderTopColor: 'divider',
                }}
              >
                <Box sx={{ mt: 1 }}>
                  <AlertDetailsByType e={e} />
                </Box>
              </Box>
            )
          })}
        </List>
      </Box>
    </Box>
  )
}
