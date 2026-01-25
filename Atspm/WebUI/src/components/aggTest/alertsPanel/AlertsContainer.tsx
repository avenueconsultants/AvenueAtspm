import AlertDetailsList from '@/components/aggTest/alertsPanel/AlertsDetailsList'
import AlertSummaryList from '@/components/aggTest/alertsPanel/AlertSummaryList'
import { AlertPayload } from '@/components/aggTest/useAlertsHub'
import { Box, Chip, Paper, Stack, Typography } from '@mui/material'
import { useCallback, useMemo, useState } from 'react'

const ALERT_TYPES: Array<{ type: string; name: string; color: string }> = [
  { type: 'object.wrong-way', name: 'Wrong-way', color: 'red' },
  { type: 'object.animal-crossing', name: 'Animal crossing', color: '#0072b2' },
]

export default function AlertsContainer({
  events,
  hubState,
  onSelectType,
}: {
  events: AlertPayload[]
  hubState?: string
  onSelectType?: (type: string | null) => void
}) {
  const [activeType, setActiveType] = useState<string | null>(null)

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

        <Typography variant="caption" sx={{ display: 'block', mt: 0.75 }}>
          {activeType
            ? 'Viewing active alerts.'
            : 'Select a type to view details.'}
        </Typography>
      </Box>

      {/* body */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Box
          sx={{
            width: activeType ? 500 : 300,
            transition: 'width 220ms ease',
            willChange: 'width',
            animation: 'fadeIn 0.2s',
          }}
        >
          {activeType ? (
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

export type SummaryItem = {
  type: string
  name: string
  count: number
  groups: ActiveEventGroup[]
  totalEvents: number
}

export type ActiveEventGroup = {
  id: number
  lastUpdateUtc: string
  events: AlertPayload[]
  typeTotalEvents: number
}

function buildSummaries(events: AlertPayload[]): SummaryItem[] {
  const eventsByType = new Map<string, AlertPayload[]>()
  for (const t of ALERT_TYPES) eventsByType.set(t.type, [])

  for (const e of events) {
    const t = e.type ?? 'unknown'
    const arr = eventsByType.get(t)
    if (arr) arr.push(e)
  }

  return ALERT_TYPES.map(({ type, name }) => {
    const typeEvents = eventsByType.get(type) ?? []

    const byId = new Map<number, AlertPayload[]>()
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
