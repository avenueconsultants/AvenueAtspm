import { SummaryItem } from '@/components/aggTest/alertsPanel/AlertsContainer'
import { GenericDetails } from '@/components/aggTest/incidentDetails/GenericDetails'
import { IllegalMovementDetails } from '@/components/aggTest/incidentDetails/IllegalMovementDetails'
import { NearMissDetails } from '@/components/aggTest/incidentDetails/NearMissDetails'
import { RedLightDetails } from '@/components/aggTest/incidentDetails/RedLightDetails'
import { WrongWayDetails } from '@/components/aggTest/incidentDetails/WrongWayDetails'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Box, Chip, IconButton, List, Stack, Typography } from '@mui/material'

interface AlertDetailsListProps {
  label: string
  alertGroup: SummaryItem
  onBack: () => void
}

export default function AlertDetailsList({
  label,
  alertGroup,
  onBack,
}: AlertDetailsListProps) {
  const AlertComponent = getAlertComponentByType(alertGroup.name)

  console.log('Rendering AlertDetailsList for type:', alertGroup)

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
            </Box>
          </Stack>

          <Chip
            size="small"
            label={`${alertGroup.groups.length}`}
            variant="outlined"
          />
        </Stack>

        <Typography variant="caption" sx={{ display: 'block', mt: 0.75 }}>
          Newest first
        </Typography>
      </Box>

      {/* body */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List disablePadding>
          {alertGroup.groups.map((e) => {
            return (
              <Box
                key={e.id}
                sx={{
                  px: 2,
                  py: 1.5,
                  borderTop: '1px solid',
                  borderTopColor: 'divider',
                  bgcolor:
                    e.events[e.events.length - 1]?.state === 'active'
                      ? 'red'
                      : 'background.paper',
                }}
              >
                <Box sx={{ mt: 1 }}>
                  <AlertComponent e={e} />
                </Box>
              </Box>
            )
          })}
        </List>
      </Box>
    </Box>
  )
}

function getAlertComponentByType(type: string) {
  switch (type) {
    case 'Wrong-way':
      return WrongWayDetails
    case 'intersection.near-miss':
      return NearMissDetails
    case 'intersection.illegal-movement':
      return IllegalMovementDetails
    case 'intersection.red-light':
      return RedLightDetails
    default:
      return GenericDetails
  }
}
