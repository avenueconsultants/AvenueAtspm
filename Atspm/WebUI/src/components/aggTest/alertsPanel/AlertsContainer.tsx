import AlertDetailsList from '@/components/aggTest/alertsPanel/AlertsDetailsList'
import { AlertEvent } from '@/components/aggTest/useAlertsHubMock'
import { Box, Chip, Paper, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useMemo, useState } from 'react'
import AlertSummaryList, { AlertSummaryListItem } from './AlertSummaryList'

type Severity = 'error' | 'warning' | 'success' | 'info'

type WithType = { type: string }
type WrongWayLogEntry = {
  position: [number, number, number]
  speed: number
  state: string
  timestamp: number
}

type NormalizedIncident = AlertEvent & {
  type: string
  lastUpdateMs: number
  latestEntry?: { state: string; timestamp: number }
}

type SummaryRow = {
  type: string
  label: string
  count: number
  latest?: NormalizedIncident
  incidents: NormalizedIncident[]
}

function getType(e: AlertEvent): string {
  return (e as any)?.type ?? 'unknown'
}

function normalizeIncident(e: AlertEvent): NormalizedIncident {
  const type = getType(e)

  // Prefer "most recent" timestamp for log-based events (wrong-way)
  if (type === 'object.wrong-way') {
    const log = ((e as any)?.log ?? []) as WrongWayLogEntry[]
    const last = log.length ? log[log.length - 1] : null
    const baseTs = (e as any)?.timestamp ?? 0
    const lastUpdateMs = last?.timestamp ?? baseTs

    return {
      ...(e as any),
      type,
      lastUpdateMs,
      latestEntry: last
        ? { state: String(last.state ?? 'unknown'), timestamp: last.timestamp }
        : undefined,
    }
  }

  // Default: use event timestamp
  const ts = ((e as any)?.timestamp ?? 0) as number
  return {
    ...(e as any),
    type,
    lastUpdateMs: ts,
  }
}

function severityForIncident(i: NormalizedIncident): Severity {
  switch (i.type) {
    case 'object.wrong-way': {
      const st = i.latestEntry?.state ?? 'unknown'
      // tune however you want; this is a sane default
      if (st === 'course-corrected') return 'success'
      if (st === 'tracking-lost') return 'info'
      return 'error'
    }

    case 'intersection.near-miss': {
      const sev = (i as any)?.severity as string | undefined
      return sev === 'critical' ? 'error' : 'warning'
    }

    case 'intersection.illegal-movement':
    case 'intersection.red-light':
      return 'warning'

    default:
      return 'info'
  }
}

export default function AlertsContainer({
  events,
  hubState,
  onFlyTo,
  onSelectType,
}: {
  events: AlertEvent[]
  hubState?: string
  onFlyTo?: (req: AlertFlyTo) => void
  onSelectType?: (type: string | null) => void
}) {
  const theme = useTheme()

  const [activeType, setActiveType] = useState<string | null>(null)

  const colorFor = (sev: Severity) => {
    switch (sev) {
      case 'error':
        return theme.palette.error.main
      case 'warning':
        return theme.palette.warning.main
      case 'success':
        return theme.palette.success.main
      default:
        return theme.palette.info.main
    }
  }

  const summaryRows = useMemo<SummaryRow[]>(() => {
    const byType = new Map<string, NormalizedIncident[]>()

    for (const raw of events) {
      const inc = normalizeIncident(raw)
      const list = byType.get(inc.type)
      if (!list) byType.set(inc.type, [inc])
      else list.push(inc)
    }

    const out: SummaryRow[] = []
    for (const [type, incidents] of byType.entries()) {
      incidents.sort((a, b) => (b.lastUpdateMs ?? 0) - (a.lastUpdateMs ?? 0))
      out.push({
        type,
        label: type,
        count: incidents.length,
        latest: incidents[0],
        incidents,
      })
    }

    out.sort((a, b) => b.count - a.count)
    return out
  }, [events])

  const summaryListItems = useMemo<AlertSummaryListItem[]>(() => {
    return summaryRows.map((s) => {
      const sev = s.latest ? severityForIncident(s.latest) : 'info'
      return {
        type: s.type,
        label: s.label,
        count: s.count,
        color: colorFor(sev),
      }
    })
  }, [summaryRows, theme]) // theme changes => palette changes

  const activeSummary = useMemo(() => {
    if (!activeType) return null
    return summaryRows.find((s) => s.type === activeType) ?? null
  }, [activeType, summaryRows])

  const setType = (t: string | null) => {
    setActiveType(t)
    onSelectType?.(t)
  }

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
              <Chip size="small" label={hubState} variant="outlined" />
            ) : null}
            <Chip size="small" label={`${events.length}`} variant="outlined" />
          </Stack>
        </Stack>

        <Typography variant="caption" sx={{ display: 'block', mt: 0.75 }}>
          Select a type to view details.
        </Typography>
      </Box>

      {/* body */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {!activeType ? (
          <AlertSummaryList items={summaryListItems} onSelectType={setType} />
        ) : (
          <AlertDetailsList
            label={activeType}
            type={activeType}
            incidents={activeSummary?.incidents ?? []}
            onBack={() => setType(null)}
            onFlyTo={onFlyTo}
          />
        )}
      </Box>
    </Paper>
  )
}
