// components/aggTest/alertsPanel/AlertDemoTriggers.tsx
import type { UiAlert } from '@/components/aggTest/hooks/types'
import { Box, Chip, Paper, Stack, Typography } from '@mui/material'
import { useCallback, useMemo, useRef, useState } from 'react'

export type DemoAlertType =
  | 'WrongWayVehicle'
  | 'NearMiss'
  | 'Congestion'
  | 'LowSpeed'
  | 'HighSpeed'
  | 'ObjectInZone'
  | 'LaneChange'
  | 'Loitering'
  | 'Stopped'
  | 'OversizedVehicle'
  | 'BelatedWalker'
  | 'IllegalMovement'
  | 'JayWalking'
  | 'ImpededDeparture'
  | 'RedLightViolation'
  | 'Unknown'
  | 'AnimalCrossing'

export const DEMO_ALERT_TYPES: Array<{
  type: DemoAlertType
  label: string
}> = [
  { type: 'WrongWayVehicle', label: 'Wrong way' },
  { type: 'NearMiss', label: 'Near miss' },
  { type: 'Congestion', label: 'Congestion' },
  { type: 'LowSpeed', label: 'Low speed' },
  { type: 'HighSpeed', label: 'High speed' },
  { type: 'ObjectInZone', label: 'Object in zone' },
  { type: 'LaneChange', label: 'Lane change' },
  { type: 'Loitering', label: 'Loitering' },
  { type: 'Stopped', label: 'Stopped' },
  { type: 'OversizedVehicle', label: 'Oversized vehicle' },
  { type: 'BelatedWalker', label: 'Belated walker' },
  { type: 'IllegalMovement', label: 'Illegal movement' },
  { type: 'JayWalking', label: 'Jaywalking' },
  { type: 'ImpededDeparture', label: 'Impeded departure' },
  { type: 'RedLightViolation', label: 'Red light' },
  { type: 'Unknown', label: 'Unknown' },
  { type: 'AnimalCrossing', label: 'Animal crossing' },
]

function randomAround(
  center: [number, number],
  maxDeltaDeg: number
): [number, number] {
  const dLat = (Math.random() * 2 - 1) * maxDeltaDeg
  const dLng = (Math.random() * 2 - 1) * maxDeltaDeg
  return [center[0] + dLat, center[1] + dLng]
}

/**
 * Hard-coded wrong-way demo points (from your screenshots)
 * 1) 40.653045, -111.952386
 * 2) 40.652717, -111.952361
 * 3) 40.652242, -111.952295
 * 4) 40.651707, -111.952161
 */
const WRONG_WAY_POINTS: Array<[number, number]> = [
  [40.653045, -111.952386],
  [40.652717, -111.952361],
  [40.652242, -111.952295],
  [40.651707, -111.952161],
]

// delay between each emitted point for wrong-way
const WRONG_WAY_STEP_DELAY_MS = 700

type WrongWaySeqArgs = {
  id: string
  incidentId: number
  stepIndex: number
  stepCount: number
  lat: number
  lng: number
  createdIso: string
  createdMs: number
  // optional overrides per-step
  speedMps?: number
  bearingDeg?: number
  overrides?: Partial<UiAlert> & { payload?: Record<string, unknown> }
}

function mkWrongWayUiAlert(args: WrongWaySeqArgs): UiAlert {
  const {
    id,
    incidentId,
    stepIndex,
    stepCount,
    lat,
    lng,
    createdIso,
    createdMs,
    speedMps = 12,
    bearingDeg = 180,
    overrides,
  } = args

  const payload: Record<string, unknown> = {
    alertType: 'WrongWayVehicle',
    source: 'demo',
    message: `[demo] WrongWayVehicle moving (${stepIndex + 1}/${stepCount})`,
    locationIdentifier: 'blueband-1',
    deviceId: null,
    url: null,
    tenantId: 'default',
    createdTimestampUtc: createdIso,
    severity: 10,

    latitude: lat,
    longitude: lng,
    object: { latitude: lat, longitude: lng },

    trackingLogs: [
      {
        latitude: lat,
        longitude: lng,
        position: [lat, lng],
        speedMps,
        bearingDeg,
      },
    ],
    eventTimestampMs: createdMs,
    eventTimeUtc: createdIso,
    detectorId: 123,
    incidentId,
  }

  const base: UiAlert = {
    id,
    type: 'WrongWayVehicle',
    message: String(payload.message ?? ''),
    locationIdentifier: String(payload.locationIdentifier ?? ''),
    url: (payload.url as any) ?? null,
    tenantId: String(payload.tenantId ?? ''),
    timestampUtc: String(payload.createdTimestampUtc ?? createdIso),
    severity: payload.severity as any,
    payload: payload as any,
  }

  const mergedPayload = overrides?.payload
    ? { ...payload, ...overrides.payload }
    : payload

  return {
    ...base,
    ...overrides,
    payload: mergedPayload as any,
  }
}

export function makeDemoUiAlert(
  type: DemoAlertType,
  center: [number, number],
  overrides?: Partial<UiAlert> & { payload?: Record<string, unknown> }
): UiAlert {
  const nowIso = new Date().toISOString()
  const [lat, lng] = randomAround(center, 0.003)

  const severity =
    type === 'WrongWayVehicle'
      ? 10
      : type === 'HighSpeed' || type === 'RedLightViolation'
        ? 8
        : 5

  const id = `${type}:demo:${Date.now()}:${Math.floor(Math.random() * 1000)}`

  const payload: Record<string, unknown> = {
    alertType: type,
    source: 'demo',
    message: `[demo] ${type} triggered`,
    locationIdentifier: 'blueband-1',
    deviceId: null,
    url: null,
    tenantId: 'default',
    createdTimestampUtc: nowIso,
    severity,

    latitude: lat,
    longitude: lng,
    object: { latitude: lat, longitude: lng },

    trackingLogs: [{ latitude: lat, longitude: lng, position: [lat, lng] }],
    eventTimestampMs: Date.now(),
    eventTimeUtc: nowIso,
    detectorId: 123,
    incidentId: Math.floor(Math.random() * 1_000_000),
  }

  const base: UiAlert = {
    id,
    type,
    message: String(payload.message ?? ''),
    locationIdentifier: String(payload.locationIdentifier ?? ''),
    url: (payload.url as any) ?? null,
    tenantId: String(payload.tenantId ?? ''),
    timestampUtc: String(payload.createdTimestampUtc ?? nowIso),
    severity: (payload.severity as any) ?? severity,
    payload: payload as any,
  }

  const mergedPayload = overrides?.payload
    ? { ...payload, ...overrides.payload }
    : payload

  return {
    ...base,
    ...overrides,
    payload: mergedPayload as any,
  }
}

export function AlertDemoTriggers({
  center,
  onTrigger,
  onClearAll,
  types,
  title = 'Demo triggers',
  chipVariant = 'outlined',
  chipSize = 'small',
}: {
  center: [number, number]
  onTrigger: (alert: UiAlert) => void
  onClearAll?: () => void
  types?: Array<{ type: DemoAlertType; label: string }>
  title?: string
  chipVariant?: 'filled' | 'outlined'
  chipSize?: 'small' | 'medium'
}) {
  const items = types ?? DEMO_ALERT_TYPES

  const [collapsed, setCollapsed] = useState(false)

  // so we can cancel scheduled wrong-way steps if the user spams the chip or clears
  const pendingTimersRef = useRef<number[]>([])

  const clearTimers = useCallback(() => {
    for (const t of pendingTimersRef.current) window.clearTimeout(t)
    pendingTimersRef.current = []
  }, [])

  useMemo(() => {
    // keep existing memo (even if unused) to avoid changing behavior elsewhere if you were logging it
    const pts = WRONG_WAY_POINTS.map(
      (p) => `${p[0].toFixed(6)}, ${p[1].toFixed(6)}`
    )
    return pts.join(' → ')
  }, [])

  const trigger = useCallback(
    (type: DemoAlertType) => {
      if (type === 'WrongWayVehicle') {
        clearTimers()

        const baseNowMs = Date.now()
        const incidentId = Math.floor(Math.random() * 1_000_000)

        // SAME UiAlert.id for all points so the UI groups them and the marker draws a trail
        const id = `WrongWayVehicle:demo:${incidentId}`

        const stepCount = WRONG_WAY_POINTS.length

        // optional: slight bearing drift to make the cone feel alive
        const bearings = [185, 182, 180, 178]
        const speedMps = 12

        WRONG_WAY_POINTS.forEach(([lat, lng], idx) => {
          const delay = idx * WRONG_WAY_STEP_DELAY_MS
          const timer = window.setTimeout(() => {
            const createdMs = baseNowMs + delay
            const createdIso = new Date(createdMs).toISOString()

            onTrigger(
              mkWrongWayUiAlert({
                id,
                incidentId,
                stepIndex: idx,
                stepCount,
                lat,
                lng,
                createdIso,
                createdMs,
                speedMps,
                bearingDeg: bearings[idx] ?? 180,
              })
            )
          }, delay)

          pendingTimersRef.current.push(timer)
        })

        return
      }

      onTrigger(makeDemoUiAlert(type, center))
    },
    [onTrigger, center, clearTimers]
  )

  const handleClearAll = useCallback(() => {
    clearTimers()
    onClearAll?.()
  }, [clearTimers, onClearAll])

  return (
    <Box sx={{ position: 'relative' }}>
      {/* COLLAPSED: tab floats in the middle of the screen; no layout space */}
      {collapsed ? (
        <Box
          sx={{
            position: 'fixed',
            top: 16, // give it breathing room so it doesn't sit on top of chips/title
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2000,
            pointerEvents: 'auto',
          }}
        >
          <Chip
            label="Show demo triggers"
            variant="filled"
            clickable
            onClick={() => setCollapsed(false)}
          />
        </Box>
      ) : (
        <Paper
          variant="outlined"
          sx={{
            px: 2,
            mb: 2, // MORE SPACE so this bar doesn't visually overlap pills/content below
            borderRadius: 1,
          }}
        >
          {/* ONE ROW ONLY; overflow becomes horizontal scroll */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.25}
            sx={{ minWidth: 0 }}
          >
            <Typography
              fontWeight={700}
              sx={{ whiteSpace: 'nowrap', flex: '0 0 auto' }}
            >
              {title}
            </Typography>

            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                overflowX: 'auto',
                overflowY: 'hidden',
                whiteSpace: 'nowrap',
                WebkitOverflowScrolling: 'touch',
                pr: 1,
                py: 2,
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ flexWrap: 'nowrap', width: 'max-content' }}
              >
                {items.map((t) => (
                  <Chip
                    key={t.type}
                    size={chipSize}
                    label={t.label}
                    variant={chipVariant}
                    clickable
                    onClick={() => trigger(t.type)}
                    sx={{ userSelect: 'none', flex: '0 0 auto' }}
                  />
                ))}
              </Stack>
            </Box>

            {onClearAll ? (
              <Chip
                size={chipSize}
                label="Clear all"
                variant="filled"
                color="info"
                clickable
                onClick={handleClearAll}
                sx={{ userSelect: 'none', flex: '0 0 auto' }}
              />
            ) : null}

            <Chip
              size={chipSize}
              label="Collapse"
              variant="outlined"
              clickable
              onClick={() => setCollapsed(true)}
              sx={{ userSelect: 'none', flex: '0 0 auto' }}
            />
          </Stack>
        </Paper>
      )}
    </Box>
  )
}
