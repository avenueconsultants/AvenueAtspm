import AlertDetailsList from '@/components/aggTest/alertsPanel/AlertsDetailsList'
import AlertSummaryList from '@/components/aggTest/alertsPanel/AlertSummaryList'
import type { UiAlert } from '@/components/aggTest/hooks/types'
import { addSpaces } from '@/utils/string'
import {
  Box,
  Chip,
  Collapse,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import { useCallback, useMemo, useState } from 'react'

const ALERT_TYPES: Array<{ type: string; name: string; color: string }> = [
  { type: 'WrongWayVehicle', name: 'Wrong-way', color: '#d32f2f' },
  { type: 'NearMiss', name: 'Near miss', color: '#f57c00' },
  { type: 'Congestion', name: 'Congestion', color: '#6d4c41' },
  { type: 'LowSpeed', name: 'Low speed', color: '#0288d1' },
  { type: 'HighSpeed', name: 'High speed', color: '#c62828' },
  { type: 'ObjectInZone', name: 'Object in zone', color: '#7b1fa2' },
  { type: 'LaneChange', name: 'Lane change', color: '#2e7d32' },
  { type: 'Loitering', name: 'Loitering', color: '#5d4037' },
  { type: 'Stopped', name: 'Stopped', color: '#455a64' },
  { type: 'OversizedVehicle', name: 'Oversized vehicle', color: '#00897b' },
  { type: 'BelatedWalker', name: 'Belated walker', color: '#5e35b1' },
  { type: 'IllegalMovement', name: 'Illegal movement', color: '#6a1b9a' },
  { type: 'JayWalking', name: 'Jaywalking', color: '#1565c0' },
  { type: 'ImpededDeparture', name: 'Impeded departure', color: '#ef6c00' },
  { type: 'RedLightViolation', name: 'Red light violation', color: '#b71c1c' },
  // not in system
  { type: 'AnimalCrossing', name: 'Animal crossing', color: '#0072b2' },
  //
  { type: 'Unknown', name: 'Unknown', color: '#757575' },
]

type ViewMode = 'type' | 'time'

export default function AlertsContainer({
  events,
  hubState,
  onSelectType,
}: {
  events: UiAlert[]
  hubState?: string
  onSelectType?: (type: string | null) => void
}) {
  const [viewMode, setViewMode] = useState<ViewMode>('type')
  const [activeType, setActiveType] = useState<string | null>(null)

  // By-time selection (expand to see details)
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null)

  const summaries = useMemo(() => buildSummaries(events), [events])

  const activeSummary = useMemo(
    () => summaries.find((s) => s.type === activeType) ?? null,
    [summaries, activeType]
  )

  const setType = useCallback(
    (type: string | null) => {
      setActiveType(type)
      onSelectType?.(type)
    },
    [onSelectType]
  )

  const summaryByType = useMemo(() => {
    const m = new Map<string, SummaryItem>()
    for (const s of summaries) m.set(s.type, s)
    return m
  }, [summaries])

  const summaryListItems = useMemo(
    () =>
      ALERT_TYPES.map((t) => {
        const s = summaryByType.get(t.type)

        return {
          type: t.type,
          label: t.name,
          color: t.color,
          count: s?.count ?? 0,
          isActive: t.type === activeType,
          onSelectType: () => setType(t.type),
        }
      }),
    [summaryByType, activeType, setType]
  )

  const timeSorted = useMemo(() => {
    return [...(events ?? [])].sort(
      (a, b) => Date.parse(b.timestampUtc) - Date.parse(a.timestampUtc)
    )
  }, [events])

  const activeTimeAlert = useMemo(() => {
    if (!activeAlertId) return null
    return timeSorted.find((e) => e.id === activeAlertId) ?? null
  }, [timeSorted, activeAlertId])

  const timeDetailsGroup = useMemo<SummaryItem | null>(() => {
    if (!activeTimeAlert) return null

    // Reuse your existing details component by creating a single-group SummaryItem
    return {
      type: activeTimeAlert.type ?? 'Unknown',
      name: activeTimeAlert.type ?? 'Unknown',
      count: 1,
      totalEvents: 1,
      groups: [
        {
          id: activeTimeAlert.id,
          lastUpdateUtc: activeTimeAlert.timestampUtc,
          events: [activeTimeAlert],
          typeTotalEvents: 1,
        },
      ],
    }
  }, [activeTimeAlert])

  const onChangeTab = useCallback(
    (_: React.SyntheticEvent, next: ViewMode) => {
      setViewMode(next)

      if (next === 'type') {
        onSelectType?.(activeType)
        setActiveAlertId(null)
      } else {
        // time view shows all alerts; remove map filtering by type
        onSelectType?.(null)
        setActiveType(null)
      }
    },
    [onSelectType, activeType]
  )

  const panelWidth =
    viewMode === 'time' ? (activeAlertId ? 400 : 400) : activeType ? 400 : 300

  const headerHint =
    viewMode === 'time'
      ? activeAlertId
        ? 'Click an alert to collapse.'
        : 'Newest alerts at the top. Click one to expand.'
      : activeType
        ? 'Viewing active alerts.'
        : 'Select a type to view details.'

  return (
    <Paper
      variant="outlined"
      sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
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
          <Typography fontWeight={700}>Alerts</Typography>

          <Stack direction="row" spacing={1} alignItems="center">
            {hubState ? (
              <Chip
                size="small"
                label={hubState}
                variant={hubState === 'Connected' ? 'filled' : 'outlined'}
                color={hubState === 'Connected' ? 'success' : 'default'}
              />
            ) : null}
            <Chip size="small" label={`${events.length}`} variant="outlined" />
          </Stack>
        </Stack>

        <Tabs value={viewMode} onChange={onChangeTab}>
          <Tab value="type" label="By type" sx={{ textTransform: 'none' }} />
          <Tab value="time" label="By time" sx={{ textTransform: 'none' }} />
        </Tabs>

        <Divider />

        <Typography variant="caption" sx={{ display: 'block', mt: 2 }}>
          {headerHint}
        </Typography>
      </Box>

      {/* body */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Box
          sx={{
            width: panelWidth,
            transition: 'width 220ms ease',
            willChange: 'width',
            animation: 'fadeIn 0.2s',
          }}
        >
          {viewMode === 'time' ? (
            <ByTimeView
              events={timeSorted}
              activeAlertId={activeAlertId}
              setActiveAlertId={setActiveAlertId}
              detailsGroup={timeDetailsGroup}
            />
          ) : activeType ? (
            <AlertDetailsList
              label={activeSummary?.name ?? activeType}
              alertGroup={activeSummary}
              onBack={() => setType(null)}
            />
          ) : (
            <AlertSummaryList items={summaryListItems} onSelectType={setType} />
          )}
        </Box>
      </Box>
    </Paper>
  )
}

function ByTimeView({
  events,
  activeAlertId,
  setActiveAlertId,
  detailsGroup,
}: {
  events: UiAlert[]
  activeAlertId: string | null
  setActiveAlertId: (id: string | null) => void
  detailsGroup: SummaryItem | null
}) {
  return (
    <Box>
      <List dense disablePadding>
        {events.map((a) => {
          const isOpen = a.id === activeAlertId
          return (
            <Box key={`time-${a.id}`}>
              <ListItemButton
                onClick={() => setActiveAlertId(isOpen ? null : a.id)}
                sx={{
                  px: 2,
                  py: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <ListItemText
                  primary={
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="baseline"
                      justifyContent="space-between"
                    >
                      <Stack direction="row" spacing={1} alignItems="baseline">
                        <Chip
                          size="small"
                          color={String(
                            a.severity === 'Warning' ? 'warning' : 'error'
                          )}
                          label={String(a.severity)}
                        />
                        <Typography fontWeight={700} variant="body1">
                          {addSpaces(a.type) ?? 'Unknown'}
                        </Typography>
                      </Stack>

                      <Typography
                        variant="caption"
                        sx={{ opacity: 0.85, whiteSpace: 'nowrap' }}
                      >
                        {formatTimestamp(a.timestampUtc)}
                      </Typography>
                    </Stack>
                  }
                  secondary={
                    <Box sx={{ mt: 0.25 }}>
                      <Typography
                        variant="caption"
                        sx={{ display: 'block', opacity: 0.85 }}
                      >
                        {a.locationIdentifier}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {a.message}
                      </Typography>
                    </Box>
                  }
                />
              </ListItemButton>

              <Collapse in={isOpen} timeout={200} unmountOnExit>
                <Box sx={{ px: 2, py: 1.5 }}>
                  {detailsGroup ? (
                    <AlertDetailsList
                      label={`${a.type ?? 'Unknown'} details`}
                      alertGroup={detailsGroup}
                      onBack={() => setActiveAlertId(null)}
                    />
                  ) : null}
                </Box>
              </Collapse>
            </Box>
          )
        })}
      </List>
    </Box>
  )
}

function formatTimestamp(iso: string) {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return iso
  // simple, locale-friendly
  return new Date(ms).toLocaleString()
}

export type SummaryItem = {
  type: string
  name: string
  count: number
  groups: ActiveEventGroup[]
  totalEvents: number
}

export type ActiveEventGroup = {
  id: string
  lastUpdateUtc: string
  events: UiAlert[]
  typeTotalEvents: number
}

function buildSummaries(events: UiAlert[]): SummaryItem[] {
  const eventsByType = new Map<string, UiAlert[]>()
  for (const t of ALERT_TYPES) eventsByType.set(t.type, [])

  for (const e of events) {
    const t = e.type ?? 'Unknown'
    const arr = eventsByType.get(t)
    if (arr) arr.push(e)
  }

  return ALERT_TYPES.map(({ type, name }) => {
    const typeEvents = eventsByType.get(type) ?? []

    const byId = new Map<string, UiAlert[]>()
    for (const e of typeEvents) {
      const id = e.id
      const arr = byId.get(id)
      if (arr) arr.push(e)
      else byId.set(id, [e])
    }

    const totalEvents = typeEvents.length

    const groups: ActiveEventGroup[] = Array.from(byId.entries()).map(
      ([id, evts]) => {
        evts.sort(
          (a, b) => Date.parse(b.timestampUtc) - Date.parse(a.timestampUtc)
        )

        return {
          id,
          lastUpdateUtc: evts[0]?.timestampUtc ?? '',
          events: evts,
          typeTotalEvents: totalEvents,
        }
      }
    )

    groups.sort(
      (a, b) => Date.parse(b.lastUpdateUtc) - Date.parse(a.lastUpdateUtc)
    )

    return {
      type,
      name,
      count: byId.size,
      groups,
      totalEvents,
    }
  })
}
