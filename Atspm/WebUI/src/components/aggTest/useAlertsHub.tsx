import * as signalR from '@microsoft/signalr'
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

type UseAlertsHubOpts = {
  tenantId?: string
  locationIds?: string[]
  withCredentials?: boolean
  skipNegotiation?: boolean

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
}

export function useAlertsHub(opts?: UseAlertsHubOpts) {
  const tenantId = opts?.tenantId ?? 'default'
  const locationIds = useMemo(
    () => opts?.locationIds ?? ['blueband-1'],
    [opts?.locationIds]
  )
  const withCreds = opts?.withCredentials ?? true
  const skipNeg = opts?.skipNegotiation ?? true

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

  const [alerts, setAlerts] = useState<AlertPayload[]>([])
  const connRef = useRef<signalR.HubConnection | null>(null)

  const url = useMemo(() => 'http://10.20.100.71:30080/hubs/stats', [])

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

  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        transport: signalR.HttpTransportType.WebSockets,
        withCredentials: withCreds,
        skipNegotiation: skipNeg,
      })
      .withAutomaticReconnect()
      .build()

    connRef.current = conn

    conn.off('alert')

    conn.on('alert', (payload) => {
      const sourcePayloadJson = safeJsonParse(payload?.sourcePayloadJson)

      const alert: AlertPayload = {
        code: payload?.code,
        message: payload?.message,
        locationIdentifier: payload?.locationIdentifier,
        url: payload?.url,
        tenantId: payload?.tenantId,
        timestampUtc: payload?.timestampUtc,
        severity: payload?.severity,
        category: payload?.category,
        sourcePayload: sourcePayloadJson,
        type: sourcePayloadJson.type,
        id: sourcePayloadJson.id,
      }

      const now = Date.now()
      setAlerts((prev) => prune([...prev, alert], now))
    })

    const rejoin = async () => {
      if (tenantId) await conn.invoke('JoinTenant', tenantId)
      for (const loc of locationIds) await conn.invoke('JoinLocation', loc)
    }

    conn.onreconnected(() => rejoin())
    ;(async () => {
      try {
        await conn.start()
        await rejoin()
      } catch (e) {
        console.error('[signalr] start failed', e)
      }
    })()

    return () => {
      conn.stop()
    }
  }, [
    url,
    tenantId,
    withCreds,
    skipNeg,
    locationIds,
    defaultTtlMs,
    ttlByTypeMs,
    maxAlerts,
    prune,
  ])

  useEffect(() => {
    const t = window.setInterval(() => {
      const now = Date.now()
      setAlerts((prev) => prune(prev, now))
    }, pruneEveryMs)

    return () => window.clearInterval(t)
  }, [pruneEveryMs, defaultTtlMs, ttlByTypeMs, maxAlerts, prune])

  return {
    state: connRef.current?.state ?? 'Disconnected',
    alerts,
  }
}

function safeJsonParse(input: unknown) {
  if (typeof input !== 'string') return null
  try {
    const parsed = JSON.parse(input)
    return parsed && typeof parsed === 'object'
      ? (parsed as SourcePayload)
      : null
  } catch {
    return null
  }
}
