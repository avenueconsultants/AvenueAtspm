// hooks/useAlertsMock.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type SourcePayload = Record<string, unknown>

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
  sourcePayload: SourcePayload
  type: string
}

type UseAlertsMockOpts = {
  tenantId?: string
  locationIds?: string[]

  /**
   * Per-type retention window (ms).
   * Example:
   *  { 'object.wrong-way': 5 * 60_000, 'object.jaywalker': 60_000 }
   */
  ttlByTypeMs?: Record<string, number>

  /** Fallback TTL when type isn’t in ttlByTypeMs (ms). */
  defaultTtlMs?: number

  /** How often to prune even if no new events arrive (ms). */
  pruneEveryMs?: number

  /** Safety cap to prevent unbounded growth. */
  maxAlerts?: number

  /** How often to emit mock events (ms). */
  emitEveryMs?: number

  /** Chance [0..1] per tick to emit an event. */
  emitProbability?: number

  /** Types to emit (defaults provided). */
  types?: string[]
}

export function useAlertsMock(opts?: UseAlertsMockOpts) {
  const tenantId = opts?.tenantId ?? 'default'
  const locationIds = useMemo(
    () => opts?.locationIds ?? ['blueband-1'],
    [opts?.locationIds]
  )

  const ttlByTypeMs = useMemo(
    () =>
      opts?.ttlByTypeMs ?? {
        'object.wrong-way': 20_000,
      },
    [opts?.ttlByTypeMs]
  )
  const defaultTtlMs = opts?.defaultTtlMs ?? 2 * 60_000
  const pruneEveryMs = opts?.pruneEveryMs ?? 5_000
  const maxAlerts = opts?.maxAlerts ?? 2000

  const emitEveryMs = opts?.emitEveryMs ?? 800
  const emitProbability = opts?.emitProbability ?? 0.85
  const types = useMemo(
    () =>
      opts?.types ?? [
        'object.wrong-way',
        'object.jaywalker',
        'object.illegal-movement',
        'object.stopped-vehicle',
      ],
    [opts?.types]
  )

  const [alerts, setAlerts] = useState<AlertPayload[]>([])
  const nextIdRef = useRef(1)

  const state = 'MockConnected'

  const getTtlMs = useCallback(
    (type: string | null | undefined) =>
      ttlByTypeMs[type ?? ''] ?? defaultTtlMs,
    [defaultTtlMs, ttlByTypeMs]
  )

  const prune = useCallback(
    (xs: AlertPayload[], nowMs: number) => {
      const keep: AlertPayload[] = []
      for (const a of xs) {
        const ts = Date.parse(a.timestampUtc)
        if (!Number.isFinite(ts)) continue
        const age = nowMs - ts
        if (age <= getTtlMs(a.type)) keep.push(a)
      }

      keep.sort(
        (a, b) => Date.parse(b.timestampUtc) - Date.parse(a.timestampUtc)
      )
      if (keep.length > maxAlerts) keep.length = maxAlerts
      return keep
    },
    [maxAlerts, getTtlMs]
  )

  const makeMockAlert = useCallback((): AlertPayload => {
    const type = pick(types)
    const id = nextIdRef.current++

    const loc = locationIds.length > 0 ? pick(locationIds) : 'blueband-1'
    const detector = randInt(1, 6)

    const lat = 40.63 + randFloat(-0.02, 0.02)
    const lng = -111.94 + randFloat(-0.02, 0.02)
    const speed = Math.max(0, randFloat(0, 45))

    const nowIso = new Date().toISOString()

    const sourcePayload: SourcePayload = {
      detector,
      id,
      type,
      timestamp: Date.now(),
      recording: 0,
      object: {
        classification: pick(['car', 'truck', 'person', 'bicycle']),
        id: [randInt(1000, 99999), Date.now() - randInt(0, 5000)],
        lwh: null,
        type: pick(['vehicle', 'person']),
        description: {
          color: pick(['red', 'white', 'black', 'silver', 'undefined']),
          confidence: randFloat(0.2, 0.99),
          'license-plate': null,
          make: null,
          model: null,
          year: null,
        },
      },
      log: [
        {
          position: [lat, lng, 0],
          speed,
          state: pick(['tracking', 'stopped', 'lost']),
          timestamp: Date.now(),
        },
      ],
    }

    const code = codeForType(type)
    const msg = messageFor(type, { detector, speed, lat, lng })

    return {
      id,
      code,
      message: msg,
      locationIdentifier: `detector-${loc}`,
      url: null,
      tenantId,
      timestampUtc: nowIso,
      severity: severityForType(type),
      category: null,
      sourcePayload,
      type,
    }
  }, [locationIds, tenantId, types])

  // Emit mock events
  useEffect(() => {
    const t = window.setInterval(() => {
      if (Math.random() > emitProbability) return

      const now = Date.now()
      const alert = makeMockAlert()
      setAlerts((prev) => prune([...prev, alert], now))
    }, emitEveryMs)

    return () => window.clearInterval(t)
  }, [emitEveryMs, emitProbability, makeMockAlert, prune])

  // Prune even if no events arrive
  useEffect(() => {
    const t = window.setInterval(() => {
      const now = Date.now()
      setAlerts((prev) => prune(prev, now))
    }, pruneEveryMs)

    return () => window.clearInterval(t)
  }, [pruneEveryMs, prune])

  return { state, alerts }
}

function pick<T>(xs: T[]) {
  return xs[Math.floor(Math.random() * xs.length)]
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randFloat(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function severityForType(type: string) {
  switch (type) {
    case 'object.wrong-way':
      return 10
    case 'object.illegal-movement':
      return 7
    case 'object.stopped-vehicle':
      return 6
    case 'object.jaywalker':
      return 4
    default:
      return 5
  }
}

function codeForType(type: string) {
  switch (type) {
    case 'object.wrong-way':
      return 9001
    case 'object.jaywalker':
      return 9002
    case 'object.illegal-movement':
      return 9003
    case 'object.stopped-vehicle':
      return 9004
    default:
      return 9999
  }
}

function messageFor(
  type: string,
  ctx: { detector: number; speed: number; lat: number; lng: number }
) {
  const mph = ctx.speed.toFixed(1)
  const ll = `${ctx.lat.toFixed(6)},${ctx.lng.toFixed(6)}`
  switch (type) {
    case 'object.wrong-way':
      return `Mock wrong-way detected (detector ${ctx.detector}) | state: tracking | speed: ${mph} mph | lat/lon: ${ll}`
    case 'object.jaywalker':
      return `Mock jaywalker detected (detector ${ctx.detector}) | state: tracking | speed: ${mph} mph | lat/lon: ${ll}`
    case 'object.illegal-movement':
      return `Mock illegal movement detected (detector ${ctx.detector}) | state: tracking | speed: ${mph} mph | lat/lon: ${ll}`
    case 'object.stopped-vehicle':
      return `Mock stopped vehicle (detector ${ctx.detector}) | state: stopped | speed: ${mph} mph | lat/lon: ${ll}`
    default:
      return `Mock event (detector ${ctx.detector}) | speed: ${mph} mph | lat/lon: ${ll}`
  }
}
