import { useCallback, useMemo, useRef, useState } from 'react'

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

  /** Base lat/lng for generated wrong-way alerts (optional). */
  baseLat?: number
  baseLng?: number

  /** How far apart the two alerts should be (degrees). */
  deltaLat?: number
  deltaLng?: number

  /** Milliseconds between the two alerts’ timestamps. */
  deltaTimeMs?: number
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

  // Trigger parameters (tunable)
  const baseLat = opts?.baseLat ?? 40.6319
  const baseLng = opts?.baseLng ?? -111.9388
  const deltaLat = opts?.deltaLat ?? 0.00025
  const deltaLng = opts?.deltaLng ?? 0.00025
  const deltaTimeMs = opts?.deltaTimeMs ?? 350

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

  const makeWrongWayAlert = useCallback(
    (p: {
      lat: number
      lng: number
      nowMs: number
      loc: string
    }): AlertPayload => {
      const type = 'object.wrong-way'
      const id = nextIdRef.current
      const detector = randInt(1, 6)
      const speed = Math.max(0, randFloat(10, 45))
      const nowIso = new Date(p.nowMs).toISOString()

      const sourcePayload: SourcePayload = {
        detector,
        id,
        type,
        timestamp: p.nowMs,
        recording: 0,
        object: {
          classification: pick(['car', 'truck']),
          id: [randInt(1000, 99999), p.nowMs - randInt(0, 5000)],
          lwh: null,
          type: 'vehicle',
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
            position: [p.lat, p.lng, 0],
            speed,
            state: 'tracking',
            timestamp: p.nowMs,
          },
        ],
      }

      const code = codeForType(type)
      const msg = messageFor(type, { detector, speed, lat: p.lat, lng: p.lng })

      return {
        id,
        code,
        message: msg,
        locationIdentifier: `detector-${p.loc}`,
        url: null,
        tenantId,
        timestampUtc: nowIso,
        severity: severityForType(type),
        category: null,
        sourcePayload,
        type,
      }
    },
    [tenantId]
  )

  /**
   * Call this from a button click to inject a deterministic 2-step wrong-way.
   * Only differences: timestamp + lat/lng offset.
   */
  const triggerWrongWay = useCallback(() => {
    const loc = locationIds.length > 0 ? pick(locationIds) : 'blueband-1'

    const now1 = Date.now()
    const now2 = now1 + deltaTimeMs

    const a1 = makeWrongWayAlert({
      lat: baseLat,
      lng: baseLng,
      nowMs: now1,
      loc,
    })

    const a2 = makeWrongWayAlert({
      lat: baseLat + deltaLat,
      lng: baseLng + deltaLng,
      nowMs: now2,
      loc,
    })

    // prune using "now2" so both are evaluated consistently
    setAlerts((prev) => prune([...prev, a1, a2], now2))
  }, [
    locationIds,
    baseLat,
    baseLng,
    deltaLat,
    deltaLng,
    deltaTimeMs,
    makeWrongWayAlert,
    prune,
  ])

  // Prune even if no events arrive
  const pruneTimerRef = useRef<number | null>(null)
  const startPrune = useCallback(() => {
    if (pruneTimerRef.current != null) return
    pruneTimerRef.current = window.setInterval(() => {
      const now = Date.now()
      setAlerts((prev) => prune(prev, now))
    }, pruneEveryMs)
  }, [pruneEveryMs, prune])

  const stopPrune = useCallback(() => {
    if (pruneTimerRef.current != null) {
      window.clearInterval(pruneTimerRef.current)
      pruneTimerRef.current = null
    }
  }, [])

  // start prune once on first render (no useEffect version)
  if (pruneTimerRef.current == null && typeof window !== 'undefined')
    startPrune()

  return { state, alerts, triggerWrongWay, stopPrune }
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
